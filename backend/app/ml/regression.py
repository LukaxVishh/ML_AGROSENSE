"""Treino, avaliação e inferência de produtividade em sacas por hectare."""

from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass
from pathlib import Path
from uuid import uuid4

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.dummy import DummyRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsRegressor
from sklearn.pipeline import Pipeline
from sklearn.tree import DecisionTreeRegressor

from app.data.validator import NUMERIC_LIMITS, create_dataset_envelope, validate_dataset
from app.ml.preprocessing import FEATURES, NUMERIC_FEATURES, create_preprocessor

SEED = 42
TARGET = "produtividade_sc_ha"


class RegressionError(ValueError):
    """Erro de domínio que a API pode apresentar como validação (HTTP 422)."""


def _estimator(algorithm, parameters, train_size):
    rules = {
        "random_forest": {"n_estimators": (10, 300), "max_depth": (2, 25), "min_samples_split": (2, 10)},
        "decision_tree": {"max_depth": (1, 20), "criterion": {"squared_error", "absolute_error"}},
        "knn": {"n_neighbors": (1, min(25, train_size)), "weights": {"uniform", "distance"}, "metric": {"euclidean", "manhattan"}},
    }
    if not isinstance(algorithm, str) or algorithm not in rules:
        raise RegressionError("Algoritmo de regressão não suportado.")
    if not isinstance(parameters, dict) or parameters.keys() - rules[algorithm].keys():
        raise RegressionError("Hiperparâmetros não suportados para o algoritmo.")
    for name, value in parameters.items():
        rule = rules[algorithm][name]
        if isinstance(rule, tuple):
            valid = type(value) is int and rule[0] <= value <= rule[1]
        else:
            valid = isinstance(value, str) and value in rule
        if not valid:
            raise RegressionError(f"Hiperparâmetro '{name}' inválido: {value!r}.")
    if algorithm == "random_forest":
        return RandomForestRegressor(random_state=SEED, **parameters)
    if algorithm == "decision_tree":
        return DecisionTreeRegressor(random_state=SEED, **parameters)
    return KNeighborsRegressor(**parameters)


def _metrics(real, predicted):
    # R² não é definido para um alvo constante, mesmo com previsões perfeitas.
    return {
        "mae": float(mean_absolute_error(real, predicted)),
        "rmse": float(np.sqrt(mean_squared_error(real, predicted))),
        "r2": None if np.ptp(real) == 0 else float(r2_score(real, predicted)),
    }


@dataclass
class RegressionArtifact:
    """Pipeline e metadados persistidos juntos, preservando a origem do modelo."""

    pipeline: Pipeline
    result: dict
    baseline_metrics: dict
    numeric_ranges: dict
    crops: tuple
    seed: int = SEED
    sklearn_version: str = sklearn.__version__


def train_regression(df: pd.DataFrame, config: dict) -> RegressionArtifact:
    """Treina apenas a configuração solicitada; não seleciona modelos pelo teste.

    O resultado HTTP fica em artifact.result. O baseline fica nos metadados,
    sem acrescentar campos ao contrato TrainingResult.
    """
    df = validate_dataset(df).reset_index(drop=True)
    if len(df) < 15:
        raise RegressionError("O treinamento exige pelo menos 15 registros.")
    if not isinstance(config, dict) or set(config) != {"dataset_id", "task", "algorithm", "hyperparameters"}:
        raise RegressionError("Configuração de treinamento inválida.")
    if config["task"] != "regressao":
        raise RegressionError("A tarefa deve ser regressao.")
    dataset_id = create_dataset_envelope(df, "treino")["dataset_id"]
    if config["dataset_id"] != dataset_id:
        raise RegressionError("O dataset_id não corresponde ao conteúdo da base.")
    train, test = train_test_split(df, test_size=0.2, random_state=SEED)
    estimator = _estimator(config["algorithm"], config["hyperparameters"], len(train))
    pipeline = Pipeline([("preprocessing", create_preprocessor()), ("estimator", estimator)])
    pipeline.fit(train[FEATURES], train[TARGET])
    predicted = pipeline.predict(test[FEATURES])
    baseline = DummyRegressor(strategy="mean").fit(train[FEATURES], train[TARGET])
    metrics = _metrics(test[TARGET].to_numpy(), predicted)
    warnings = ["Dados sintéticos: as métricas não comprovam validade agronômica."]
    if metrics["r2"] is None:
        warnings.append("R² indefinido: produtividade constante no conjunto de teste.")
    result = {
        "model_id": f"reg-{uuid4().hex}", "dataset_id": dataset_id,
        "config": deepcopy(config), "mode": "real",
        "train_size": len(train), "test_size": len(test), "metrics": metrics,
        "test_samples": [
            {"talhao_id": str(tid), "real": float(real), "previsto": float(pred)}
            for tid, real, pred in zip(test["talhao_id"], test[TARGET], predicted)
        ], "warnings": warnings,
    }
    return RegressionArtifact(
        pipeline, result, _metrics(test[TARGET].to_numpy(), baseline.predict(test[FEATURES])),
        {name: (float(train[name].min()), float(train[name].max())) for name in NUMERIC_FEATURES},
        tuple(sorted(train["cultura"].unique())),
    )


def predict_regression(artifact: RegressionArtifact, scenario: dict, *, dataset_id: str) -> dict:
    """Infere sem novo treino e informa extrapolação dos intervalos do treino."""
    if dataset_id != artifact.result["dataset_id"]:
        raise RegressionError("O modelo pertence a outra base.")
    if not isinstance(scenario, dict) or set(scenario) != {*FEATURES, "municipio"}:
        raise RegressionError("Informe município, cultura e as seis variáveis numéricas.")
    if not isinstance(scenario["municipio"], str) or not scenario["municipio"].strip():
        raise RegressionError("O município é obrigatório.")
    if scenario["cultura"] not in artifact.crops:
        raise RegressionError("A cultura não foi observada no treinamento.")
    warnings = []
    for name in NUMERIC_FEATURES:
        value = scenario[name]
        low, high = NUMERIC_LIMITS[name]
        if type(value) not in (int, float) or not np.isfinite(value) or not low <= value <= high:
            raise RegressionError(f"Valor inválido para '{name}'.")
        observed_low, observed_high = artifact.numeric_ranges[name]
        if not observed_low <= value <= observed_high:
            warnings.append(f"{name}: valor fora do intervalo observado no treino [{observed_low}, {observed_high}].")
    prediction = float(artifact.pipeline.predict(pd.DataFrame([scenario])[FEATURES])[0])
    if not np.isfinite(prediction):
        raise RegressionError("O modelo produziu uma previsão não finita.")
    return {
        "dataset_id": dataset_id, "model_ids": {"regressao": artifact.result["model_id"]},
        "produtividade_estimada_sc_ha": prediction, "risco_predito": None,
        "probabilidades": None, "mode": "real", "warnings": warnings,
    }


def save_regression(artifact: RegressionArtifact, path: str | Path) -> None:
    """Salva pipeline, configuração, métricas e identificação em um único arquivo."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(artifact, path)


def load_regression(path: str | Path) -> RegressionArtifact:
    """Carrega somente arquivos joblib confiáveis, criados pela própria equipe."""
    artifact = joblib.load(path)
    if not isinstance(artifact, RegressionArtifact):
        raise RegressionError("Arquivo incompatível com o artefato de regressão.")
    if artifact.sklearn_version != sklearn.__version__:
        raise RegressionError("Versão do scikit-learn diferente da utilizada no treinamento.")
    return artifact
