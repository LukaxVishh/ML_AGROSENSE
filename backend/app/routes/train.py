"""Rota de treinamento dos pipelines de regressão e classificação."""

from flask import Blueprint, jsonify

from app.errors import ApiError
from app.ml.classification import ClassificationError, train_classification
from app.ml.regression import RegressionError, train_regression
from app.routes.common import get_registry, require_exact_keys, require_json_object
from app.services import DatasetNotFoundError, TrainingInProgressError

train_blueprint = Blueprint("train", __name__)
TASKS = {"regressao", "classificacao"}


@train_blueprint.post("/model/train")
def train_model():
    """Treina uma tarefa sobre uma base registrada e publica o artefato resultante.

    A rota confere apenas o formato da requisição. Algoritmos, hiperparâmetros e
    divisão treino/teste continuam sob responsabilidade dos módulos dos Devs 3 e 4.
    """
    config = require_json_object()
    require_exact_keys(
        config,
        {"dataset_id", "task", "algorithm", "hyperparameters"},
        "A configuração de treinamento",
    )
    if not isinstance(config["dataset_id"], str) or not config["dataset_id"].strip():
        raise ApiError(422, "schema_invalido", "O dataset_id deve ser um texto não vazio.")
    if not isinstance(config["task"], str) or config["task"] not in TASKS:
        raise ApiError(422, "tarefa_invalida", "A tarefa deve ser regressao ou classificacao.")
    if not isinstance(config["hyperparameters"], dict):
        raise ApiError(422, "schema_invalido", "hyperparameters deve ser um objeto.")

    registry = get_registry()
    # Cópia da base: o pipeline pode transformar o DataFrame sem afetar o registro.
    try:
        dataframe = registry.get_dataframe(config["dataset_id"])
    except DatasetNotFoundError as exc:
        raise ApiError(404, "dataset_nao_encontrado", str(exc)) from exc

    # `register_model` fica dentro do bloco: um treino que falhe levanta antes de
    # publicar, preservando o modelo válido anterior conforme a seção 5 do contrato.
    try:
        with registry.training_slot(config["dataset_id"], config["task"]):
            if config["task"] == "regressao":
                artifact = train_regression(dataframe, config)
            else:
                artifact = train_classification(dataframe, config)
            registry.register_model(artifact, config["task"])
    except TrainingInProgressError as exc:
        raise ApiError(409, "treino_em_andamento", str(exc)) from exc
    except (RegressionError, ClassificationError) as exc:
        raise ApiError(422, "treino_invalido", str(exc)) from exc

    return jsonify(artifact.result), 201
