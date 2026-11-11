"""Rota de inferência combinada para produtividade e risco."""

from flask import Blueprint, jsonify

from app.errors import ApiError
from app.ml.classification import ClassificationError, predict_classification
from app.ml.regression import RegressionError, predict_regression
from app.routes.common import get_registry, require_exact_keys, require_json_object
from app.services import DatasetNotFoundError, ModelConflictError, ModelNotFoundError

predict_blueprint = Blueprint("predict", __name__)
TASKS = ("regressao", "classificacao")


@predict_blueprint.post("/predict")
def predict():
    """Executa uma ou as duas tarefas pedidas sobre modelos já registrados.

    Nenhum treinamento ocorre aqui: os pipelines ajustados são recuperados do
    registro pelo `model_id` informado.
    """
    payload = require_json_object()
    require_exact_keys(payload, {"dataset_id", "model_ids", "input"}, "A requisição de previsão")

    dataset_id = payload["dataset_id"]
    model_ids = payload["model_ids"]
    scenario = payload["input"]
    if not isinstance(dataset_id, str) or not dataset_id.strip():
        raise ApiError(422, "schema_invalido", "O dataset_id deve ser um texto não vazio.")
    if not isinstance(model_ids, dict) or not model_ids or set(model_ids) - set(TASKS):
        raise ApiError(
            422,
            "modelos_invalidos",
            "Informe ao menos um model_id de regressao ou classificacao.",
        )
    if any(not isinstance(model_id, str) or not model_id.strip() for model_id in model_ids.values()):
        raise ApiError(422, "modelos_invalidos", "Cada model_id deve ser um texto não vazio.")
    if not isinstance(scenario, dict):
        raise ApiError(422, "schema_invalido", "O campo input deve ser um objeto.")

    # A base precisa continuar registrada: um artefato pré-carregado pode apontar
    # para um dataset_id que não existe mais neste processo.
    registry = get_registry()
    try:
        registry.get_dataset(dataset_id)
    except DatasetNotFoundError as exc:
        raise ApiError(404, "dataset_nao_encontrado", str(exc)) from exc

    # Resolver todos os modelos antes de prever qualquer um evita responder
    # parcialmente quando o segundo model_id é inválido.
    entries = {}
    try:
        for task, model_id in model_ids.items():
            entries[task] = registry.resolve_model(model_id, task=task, dataset_id=dataset_id)
    except ModelNotFoundError as exc:
        raise ApiError(404, "modelo_nao_encontrado", str(exc)) from exc
    except ModelConflictError as exc:
        raise ApiError(409, "modelo_incompativel", str(exc)) from exc

    # Tarefa não solicitada permanece `null` na resposta; nunca se inventa valor.
    productivity = None
    risk = None
    probabilities = None
    warnings: list[str] = []
    try:
        if "regressao" in entries:
            result = predict_regression(entries["regressao"].artifact, scenario, dataset_id=dataset_id)
            productivity = result["produtividade_estimada_sc_ha"]
            warnings.extend(result["warnings"])
        if "classificacao" in entries:
            result = predict_classification(
                entries["classificacao"].artifact,
                scenario,
                dataset_id=dataset_id,
            )
            risk = result["risco_predito"]
            probabilities = result["probabilidades"]
            warnings.extend(result["warnings"])
    except (RegressionError, ClassificationError) as exc:
        raise ApiError(422, "cenario_invalido", str(exc)) from exc

    return jsonify({
        "dataset_id": dataset_id,
        "model_ids": model_ids,
        "produtividade_estimada_sc_ha": productivity,
        "risco_predito": risk,
        "probabilidades": probabilities,
        "mode": "real",
        # As duas tarefas avisam sobre a mesma extrapolação; `dict.fromkeys`
        # remove as repetições preservando a ordem de detecção.
        "warnings": list(dict.fromkeys(warnings)),
    })
