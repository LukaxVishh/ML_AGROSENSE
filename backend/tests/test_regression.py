"""Verificações da entrega do Dev 3, sem depender do servidor HTTP."""

import json
from pathlib import Path

import numpy as np
import pytest
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.model_selection import train_test_split

from app.data import load_dataset
from app.data.validator import create_dataset_envelope
from app.ml.preprocessing import FEATURES, NUMERIC_FEATURES
from app.ml.regression import (
    RegressionError, load_regression, predict_regression, save_regression, train_regression,
)


@pytest.fixture
def df():
    return load_dataset(Path(__file__).resolve().parents[2] / "data/examples/safra_mista_sul.csv")


def config(df, algorithm="decision_tree", parameters=None):
    return {"dataset_id": create_dataset_envelope(df, "teste")["dataset_id"],
            "task": "regressao", "algorithm": algorithm, "hyperparameters": parameters or {}}


def scenario(df):
    return df.iloc[0][[*FEATURES, "municipio"]].to_dict()


@pytest.mark.parametrize("algorithm,parameters", [
    ("random_forest", {"n_estimators": 10, "max_depth": 3, "min_samples_split": 2}),
    ("decision_tree", {"max_depth": 4, "criterion": "absolute_error"}),
    ("knn", {"n_neighbors": 3, "weights": "distance", "metric": "manhattan"}),
])
def test_algorithms_metrics_and_audit(df, algorithm, parameters):
    artifact = train_regression(df, config(df, algorithm, parameters))
    result = artifact.result
    samples = result["test_samples"]
    real = [s["real"] for s in samples]
    predicted = [s["previsto"] for s in samples]
    assert result["metrics"]["mae"] == pytest.approx(mean_absolute_error(real, predicted))
    assert result["metrics"]["rmse"] == pytest.approx(np.sqrt(mean_squared_error(real, predicted)))
    train, test = train_test_split(df, test_size=.2, random_state=42)
    assert [s["talhao_id"] for s in samples] == test.talhao_id.tolist()
    assert result["train_size"] == len(train)
    assert result["test_size"] == len(samples) == len(test)
    assert artifact.baseline_metrics["mae"] == pytest.approx(np.mean(abs(test.produtividade_sc_ha - train.produtividade_sc_ha.mean())))
    assert artifact.pipeline.named_steps["estimator"].get_params().items() >= parameters.items()
    json.dumps(result, allow_nan=False)


def test_preprocessing_fits_only_training_rows(df):
    artifact = train_regression(df, config(df))
    train, _ = train_test_split(df, test_size=.2, random_state=42)
    transformer = artifact.pipeline.named_steps["preprocessing"]
    scaler = transformer.named_transformers_["numeric"].named_steps["scaler"]
    np.testing.assert_allclose(scaler.mean_, train[NUMERIC_FEATURES].mean())
    assert list(artifact.pipeline.feature_names_in_) == FEATURES
    assert "risco_quebra" not in FEATURES and "produtividade_sc_ha" not in FEATURES


@pytest.mark.parametrize("algorithm,parameters", [
    ("random_forest", {"n_estimators": 9}), ("random_forest", {"max_depth": True}),
    ("decision_tree", {"criterion": "gini"}), ("knn", {"weights": "errado"}),
    ("knn", {"n_neighbors": 26}), ("decision_tree", {"extra": 1}),
    ("inexistente", {}),
])
def test_invalid_parameters(df, algorithm, parameters):
    with pytest.raises(RegressionError):
        train_regression(df, config(df, algorithm, parameters))


def test_knn_cannot_exceed_training_size(df):
    small = df.iloc[:15]
    with pytest.raises(RegressionError):
        train_regression(small, config(small, "knn", {"n_neighbors": 13}))


def test_small_dataset_and_wrong_identity(df):
    with pytest.raises(RegressionError, match="15"):
        train_regression(df.iloc[:14], config(df.iloc[:14]))
    wrong = config(df)
    wrong["dataset_id"] = "outra-base"
    with pytest.raises(RegressionError, match="dataset_id"):
        train_regression(df, wrong)


def test_constant_target(df):
    df["produtividade_sc_ha"] = 70.
    result = train_regression(df, config(df)).result
    assert result["metrics"] == {"mae": 0., "rmse": 0., "r2": None}
    json.dumps(result, allow_nan=False)


def test_persistence_and_prediction_without_refit(df, tmp_path, monkeypatch):
    artifact = train_regression(df, config(df))
    path = tmp_path / "model.joblib"
    save_regression(artifact, path)
    restored = load_regression(path)
    def forbid_fit(*args, **kwargs):
        raise AssertionError("Inferência não pode treinar novamente")
    monkeypatch.setattr(restored.pipeline, "fit", forbid_fit)
    kwargs = {"dataset_id": artifact.result["dataset_id"]}
    expected = predict_regression(artifact, scenario(df), **kwargs)
    assert predict_regression(restored, scenario(df), **kwargs) == expected
    assert restored.result == artifact.result
    with pytest.raises(RegressionError, match="outra base"):
        predict_regression(restored, scenario(df), dataset_id="outra")


@pytest.mark.parametrize("field,value", [("cultura", "Algodão"), ("ph_solo", float("nan")),
    ("area_hectares", True), ("precipitacao_mm", "1200"), ("municipio", "")])
def test_invalid_scenario(df, field, value):
    artifact = train_regression(df, config(df))
    data = scenario(df)
    data[field] = value
    with pytest.raises(RegressionError):
        predict_regression(artifact, data, dataset_id=artifact.result["dataset_id"])


def test_extrapolation_warning_and_reproducibility(df):
    first = train_regression(df, config(df))
    second = train_regression(df, config(df))
    assert first.result["test_samples"] == second.result["test_samples"]
    data = scenario(df)
    data["precipitacao_mm"] = 3000
    result = predict_regression(first, data, dataset_id=first.result["dataset_id"])
    assert any("precipitacao_mm" in warning for warning in result["warnings"])
    assert result["risco_predito"] is None and result["probabilidades"] is None


def test_culture_seen_only_in_test_is_rejected(df):
    train, test = train_test_split(df, test_size=.2, random_state=42)
    df = df.copy()
    df.loc[train.index, "cultura"] = "Soja"
    df.loc[test.index, "cultura"] = "Milho"
    artifact = train_regression(df, config(df))
    assert artifact.crops == ("Soja",)
    encoder = artifact.pipeline.named_steps["preprocessing"].named_transformers_["categorical"].named_steps["encoder"]
    assert encoder.categories_[0].tolist() == ["Soja"]
    data = scenario(df)
    data["cultura"] = "Milho"
    with pytest.raises(RegressionError, match="cultura"):
        predict_regression(artifact, data, dataset_id=artifact.result["dataset_id"])
