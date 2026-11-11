"""Verificações da entrega do Dev 4, sem depender do servidor HTTP."""

from pathlib import Path

import numpy as np
import pytest
from sklearn.metrics import accuracy_score, confusion_matrix
from sklearn.model_selection import train_test_split

from app.data import load_dataset
from app.data.validator import create_dataset_envelope
from app.ml.preprocessing import FEATURES
from app.ml.classification import (
    CLASSES, ClassificationError, load_classification, predict_classification,
    save_classification, train_classification,
)


@pytest.fixture
def df():
    df = load_dataset(Path(__file__).resolve().parents[2] / "data/examples/safra_mista_sul.csv")
    # A base fornecida tem só risco Baixo; distribua rótulos sintéticos para
    # exercitar a matriz e as probabilidades das três classes.
    df["risco_quebra"] = [CLASSES[i % len(CLASSES)] for i in range(len(df))]
    return df


def config(df, algorithm="decision_tree", parameters=None):
    return {"dataset_id": create_dataset_envelope(df, "teste")["dataset_id"],
            "task": "classificacao", "algorithm": algorithm, "hyperparameters": parameters or {}}


def scenario(df):
    return df.iloc[0][[*FEATURES, "municipio"]].to_dict()


@pytest.mark.parametrize("algorithm,parameters", [
    ("random_forest", {"n_estimators": 10, "max_depth": 3, "min_samples_split": 2}),
    ("decision_tree", {"max_depth": 4, "criterion": "entropy"}),
    ("knn", {"n_neighbors": 3, "weights": "distance", "metric": "manhattan"}),
])
def test_algorithms_metrics_audit_and_matrix(df, algorithm, parameters):
    artifact = train_classification(df, config(df, algorithm, parameters))
    result = artifact.result
    samples = result["test_samples"]
    real = [s["real"] for s in samples]
    predicted = [s["previsto"] for s in samples]
    matrix = confusion_matrix(real, predicted, labels=CLASSES)
    metrics = result["metrics"]
    assert metrics["classes"] == CLASSES
    assert set(real) == set(CLASSES)
    assert metrics["confusion_matrix"] == matrix.tolist()
    assert sum(map(sum, matrix)) == result["test_size"] == len(samples)
    assert metrics["accuracy"] == pytest.approx(accuracy_score(real, predicted))
    assert metrics["accuracy"] == pytest.approx(np.trace(matrix) / matrix.sum())
    train, test = train_test_split(df, test_size=.2, random_state=42, stratify=df.risco_quebra)
    assert [s["talhao_id"] for s in samples] == test.talhao_id.tolist()
    assert result["train_size"] == len(train)
    assert result["test_size"] == len(test)
    assert artifact.pipeline.named_steps["estimator"].get_params().items() >= parameters.items()


@pytest.mark.parametrize("algorithm,parameters", [
    ("random_forest", {"n_estimators": 9}), ("random_forest", {"max_depth": True}),
    ("decision_tree", {"criterion": "squared_error"}), ("knn", {"weights": "errado"}),
    ("knn", {"n_neighbors": 26}), ("decision_tree", {"extra": 1}), ("inexistente", {}),
])
def test_invalid_parameters(df, algorithm, parameters):
    with pytest.raises(ClassificationError):
        train_classification(df, config(df, algorithm, parameters))


def test_missing_or_underrepresented_classes_and_small_dataset(df):
    missing = df.copy()
    missing["risco_quebra"] = "Baixo"
    single_class = train_classification(missing, config(missing))
    assert single_class.result["metrics"]["classes"] == CLASSES
    assert any("Classes ausentes" in warning for warning in single_class.result["warnings"])
    rare = df.copy()
    rare["risco_quebra"] = "Baixo"
    rare.loc[rare.index[0], "risco_quebra"] = "Moderado"
    rare.loc[rare.index[1], "risco_quebra"] = "Alto"
    with pytest.raises(ClassificationError, match="ao menos 2"):
        train_classification(rare, config(rare))
    with pytest.raises(ClassificationError, match="15"):
        train_classification(df.iloc[:14], config(df.iloc[:14]))


def test_prediction_probabilities_and_persistence(df, tmp_path, monkeypatch):
    artifact = train_classification(df, config(df, "random_forest", {"n_estimators": 10}))
    scenario_data = scenario(df)
    expected = predict_classification(artifact, scenario_data, dataset_id=artifact.result["dataset_id"])
    assert expected["risco_predito"] in CLASSES
    assert list(expected["probabilidades"]) == CLASSES
    assert sum(expected["probabilidades"].values()) == pytest.approx(1)
    assert expected["produtividade_estimada_sc_ha"] is None
    path = tmp_path / "nested/model.joblib"
    save_classification(artifact, path)
    restored = load_classification(path)
    def forbid_fit(*args, **kwargs):
        raise AssertionError("Inferência não pode treinar novamente")
    monkeypatch.setattr(restored.pipeline, "fit", forbid_fit)
    assert predict_classification(restored, scenario_data, dataset_id=artifact.result["dataset_id"]) == expected
    with pytest.raises(ClassificationError, match="outra base"):
        predict_classification(restored, scenario_data, dataset_id="outra")


def test_classification_rejects_wrong_task_and_invalid_scenario(df):
    bad = config(df)
    bad["task"] = "regressao"
    with pytest.raises(ClassificationError, match="classificacao"):
        train_classification(df, bad)
    artifact = train_classification(df, config(df))
    data = scenario(df)
    data["cultura"] = "Algodão"
    with pytest.raises(ClassificationError, match="cultura"):
        predict_classification(artifact, data, dataset_id=artifact.result["dataset_id"])
