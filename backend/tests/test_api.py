"""Testes HTTP da entrega do Dev 5 e da integração com dados e modelos."""

from __future__ import annotations

import io
import json
from pathlib import Path

import pytest

from app.main import create_app
from app.ml.regression import save_regression
from app.services import ModelRegistry

EXAMPLES_DIR = Path(__file__).resolve().parents[2] / "data" / "examples"


@pytest.fixture
def registry():
    """Registro isolado por teste, sem artefatos .joblib locais da máquina."""
    return ModelRegistry(
        examples_dir=EXAMPLES_DIR,
        load_default_datasets=True,
        load_pretrained_models=False,
    )


@pytest.fixture
def app(registry):
    return create_app({"TESTING": True}, registry=registry)


@pytest.fixture
def client(app):
    return app.test_client()


def _train(client, dataset_id, task="regressao", algorithm="decision_tree", hyperparameters=None):
    return client.post("/api/model/train", json={
        "dataset_id": dataset_id,
        "task": task,
        "algorithm": algorithm,
        "hyperparameters": hyperparameters or {},
    })


def _scenario(record):
    fields = [
        "municipio",
        "cultura",
        "area_hectares",
        "precipitacao_mm",
        "temperatura_media",
        "umidade_solo_pct",
        "ph_solo",
        "teor_argila_pct",
    ]
    return {field: record[field] for field in fields}


def _upload(client, path):
    return client.post(
        "/api/upload",
        data={"file": (io.BytesIO(path.read_bytes()), path.name)},
        content_type="multipart/form-data",
    )


def test_health_default_dataset_and_cors(client):
    health = client.get(
        "/api/health",
        headers={"Origin": "http://localhost:5173"},
    )
    assert health.status_code == 200
    assert health.get_json() == {"status": "ok", "contract_version": "1.0"}
    assert health.headers["Access-Control-Allow-Origin"] == "http://localhost:5173"

    response = client.get("/api/data")
    assert response.status_code == 200
    dataset = response.get_json()
    assert dataset["filename"] == "safra_mista_sul.csv"
    assert dataset["summary"]["total_talhoes"] == len(dataset["records"]) == 150
    assert dataset["mode"] == "real"


def test_get_unknown_dataset_and_unknown_route_return_standard_errors(client):
    response = client.get("/api/data?dataset_id=ds-inexistente")
    assert response.status_code == 404
    assert response.get_json()["erro"]["codigo"] == "dataset_nao_encontrado"

    response = client.get("/api/inexistente")
    assert response.status_code == 404
    assert response.get_json() == {
        "erro": {"codigo": "rota_nao_encontrada", "mensagem": "Rota não encontrada."}
    }


def test_upload_registers_dataset_and_makes_it_default(client):
    response = _upload(client, EXAMPLES_DIR / "safra_soja_favoravel.csv")
    assert response.status_code == 201
    uploaded = response.get_json()
    assert uploaded["filename"] == "safra_soja_favoravel.csv"
    assert uploaded["summary"]["total_talhoes"] == 150

    assert client.get("/api/data").get_json()["dataset_id"] == uploaded["dataset_id"]
    assert client.get(f"/api/data?dataset_id={uploaded['dataset_id']}").get_json() == uploaded


@pytest.mark.parametrize(
    "content,filename,status,code",
    [
        (b"[]", "vazio.json", 400, "arquivo_malformado"),
        (b"conteudo", "dados.txt", 415, "formato_nao_suportado"),
        (b"x" * ((2 * 1024 * 1024) + 1), "grande.csv", 413, "arquivo_muito_grande"),
    ],
)
def test_failed_upload_preserves_previous_default(client, content, filename, status, code):
    previous = client.get("/api/data").get_json()["dataset_id"]
    response = client.post(
        "/api/upload",
        data={"file": (io.BytesIO(content), filename)},
        content_type="multipart/form-data",
    )
    assert response.status_code == status
    assert response.get_json()["erro"]["codigo"] == code
    assert client.get("/api/data").get_json()["dataset_id"] == previous


def test_json_upload_rejects_text_in_numeric_field(client):
    records = json.loads((EXAMPLES_DIR / "safra_milho_seca_severa.json").read_text(encoding="utf-8"))
    records[0]["area_hectares"] = str(records[0]["area_hectares"])
    response = client.post(
        "/api/upload",
        data={"file": (io.BytesIO(json.dumps(records).encode()), "tipos-invalidos.json")},
        content_type="multipart/form-data",
    )
    assert response.status_code == 422
    assert response.get_json()["erro"]["codigo"] == "schema_invalido"


def test_training_and_combined_prediction_follow_contract(client, registry):
    dataset = client.get("/api/data").get_json()
    regression = _train(client, dataset["dataset_id"])
    classification = _train(client, dataset["dataset_id"], task="classificacao")
    assert regression.status_code == classification.status_code == 201

    regression_result = regression.get_json()
    classification_result = classification.get_json()
    assert regression_result["config"]["task"] == "regressao"
    assert len(regression_result["test_samples"]) == regression_result["test_size"]
    assert classification_result["metrics"]["classes"] == ["Baixo", "Moderado", "Alto"]
    assert sum(map(sum, classification_result["metrics"]["confusion_matrix"])) == classification_result["test_size"]
    assert registry.model_count == 2

    model_ids = {
        "regressao": regression_result["model_id"],
        "classificacao": classification_result["model_id"],
    }
    response = client.post("/api/predict", json={
        "dataset_id": dataset["dataset_id"],
        "model_ids": model_ids,
        "input": _scenario(dataset["records"][0]),
    })
    assert response.status_code == 200
    prediction = response.get_json()
    assert prediction["dataset_id"] == dataset["dataset_id"]
    assert prediction["model_ids"] == model_ids
    assert isinstance(prediction["produtividade_estimada_sc_ha"], float)
    assert prediction["risco_predito"] in {"Baixo", "Moderado", "Alto"}
    assert sum(prediction["probabilidades"].values()) == pytest.approx(1)
    assert prediction["mode"] == "real"

    regression_only = client.post("/api/predict", json={
        "dataset_id": dataset["dataset_id"],
        "model_ids": {"regressao": regression_result["model_id"]},
        "input": _scenario(dataset["records"][0]),
    }).get_json()
    assert regression_only["risco_predito"] is None
    assert regression_only["probabilidades"] is None
    assert regression_only["model_ids"] == {"regressao": regression_result["model_id"]}


def test_failed_training_does_not_publish_model(client, registry):
    dataset_id = client.get("/api/data").get_json()["dataset_id"]
    valid = _train(client, dataset_id).get_json()
    assert registry.model_count == 1
    response = _train(
        client,
        dataset_id,
        algorithm="decision_tree",
        hyperparameters={"criterion": "gini"},
    )
    assert response.status_code == 422
    assert response.get_json()["erro"]["codigo"] == "treino_invalido"
    assert registry.model_count == 1
    assert registry.resolve_model(
        valid["model_id"], task="regressao", dataset_id=dataset_id
    ).artifact.result == valid


def test_training_lock_rejects_concurrent_training(client, registry):
    # Ocupar o slot pelo próprio registro simula um treino em curso sem precisar
    # de threads, mantendo o teste determinístico.
    dataset_id = client.get("/api/data").get_json()["dataset_id"]
    with registry.training_slot(dataset_id, "regressao"):
        response = _train(client, dataset_id)
    assert response.status_code == 409
    assert response.get_json()["erro"]["codigo"] == "treino_em_andamento"
    assert registry.model_count == 0


def test_prediction_rejects_unknown_conflicting_and_wrong_task_models(client):
    dataset = client.get("/api/data").get_json()
    trained = _train(client, dataset["dataset_id"]).get_json()
    scenario = _scenario(dataset["records"][0])

    unknown = client.post("/api/predict", json={
        "dataset_id": dataset["dataset_id"],
        "model_ids": {"regressao": "reg-inexistente"},
        "input": scenario,
    })
    assert unknown.status_code == 404
    assert unknown.get_json()["erro"]["codigo"] == "modelo_nao_encontrado"

    wrong_task = client.post("/api/predict", json={
        "dataset_id": dataset["dataset_id"],
        "model_ids": {"classificacao": trained["model_id"]},
        "input": scenario,
    })
    assert wrong_task.status_code == 409
    assert wrong_task.get_json()["erro"]["codigo"] == "modelo_incompativel"

    other = _upload(client, EXAMPLES_DIR / "safra_soja_favoravel.csv").get_json()
    conflict = client.post("/api/predict", json={
        "dataset_id": other["dataset_id"],
        "model_ids": {"regressao": trained["model_id"]},
        "input": _scenario(other["records"][0]),
    })
    assert conflict.status_code == 409
    assert conflict.get_json()["erro"]["codigo"] == "modelo_incompativel"


def test_prediction_rejects_culture_absent_from_training(client):
    dataset = client.get("/api/data").get_json()
    trained = _train(client, dataset["dataset_id"]).get_json()
    scenario = _scenario(dataset["records"][0])
    scenario["cultura"] = "Algodão"
    response = client.post("/api/predict", json={
        "dataset_id": dataset["dataset_id"],
        "model_ids": {"regressao": trained["model_id"]},
        "input": scenario,
    })
    assert response.status_code == 422
    assert response.get_json()["erro"]["codigo"] == "cenario_invalido"


def test_json_and_payload_errors_are_standardized(client):
    malformed = client.post(
        "/api/model/train",
        data="{",
        content_type="application/json",
    )
    assert malformed.status_code == 400
    assert malformed.get_json()["erro"]["codigo"] == "json_malformado"

    no_models = client.post("/api/predict", json={
        "dataset_id": client.get("/api/data").get_json()["dataset_id"],
        "model_ids": {},
        "input": {},
    })
    assert no_models.status_code == 422
    assert no_models.get_json()["erro"]["codigo"] == "modelos_invalidos"


def test_trusted_artifact_is_preloaded_with_its_metadata(client, registry, tmp_path):
    dataset_id = client.get("/api/data").get_json()["dataset_id"]
    result = _train(client, dataset_id).get_json()
    entry = registry.resolve_model(result["model_id"], task="regressao", dataset_id=dataset_id)
    save_regression(entry.artifact, tmp_path / "modelo_produtividade.joblib")

    restored = ModelRegistry(
        examples_dir=EXAMPLES_DIR,
        models_dir=tmp_path,
        load_default_datasets=True,
        load_pretrained_models=True,
    )
    assert restored.model_count == 1
    loaded = restored.resolve_model(result["model_id"], task="regressao", dataset_id=dataset_id)
    assert loaded.artifact.result == entry.artifact.result
