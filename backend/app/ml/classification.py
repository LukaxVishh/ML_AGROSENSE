"""Treino, avaliação e inferência da classe didática de risco de quebra."""

from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass
from pathlib import Path
from uuid import uuid4

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.tree import DecisionTreeClassifier

from app.data.validator import ALLOWED_RISKS, NUMERIC_LIMITS, create_dataset_envelope, validate_dataset
from app.ml.preprocessing import FEATURES, NUMERIC_FEATURES, create_preprocessor

SEED = 42
TARGET = "risco_quebra"
CLASSES = ["Baixo", "Moderado", "Alto"]


class ClassificationError(ValueError):
    """Erro de domínio que a API pode apresentar como validação (HTTP 422)."""


def _estimator(algorithm, parameters, train_size):
    rules = {
        "random_forest": {"n_estimators": (10, 300), "max_depth": (2, 25), "min_samples_split": (2, 10)},
        "decision_tree": {"max_depth": (1, 20), "criterion": {"gini", "entropy"}},
        "knn": {"n_neighbors": (1, min(25, train_size)), "weights": {"uniform", "distance"}, "metric": {"euclidean", "manhattan"}},
    }
    if not isinstance(algorithm, str) or algorithm not in rules:
        raise ClassificationError("Algoritmo de classificação não suportado.")
    if not isinstance(parameters, dict) or parameters.keys() - rules[algorithm].keys():
        raise ClassificationError("Hiperparâmetros não suportados para o algoritmo.")
    for name, value in parameters.items():
        rule = rules[algorithm][name]
        valid = type(value) is int and rule[0] <= value <= rule[1] if isinstance(rule, tuple) else isinstance(value, str) and value in rule
        if not valid:
            raise ClassificationError(f"Hiperparâmetro '{name}' inválido: {value!r}.")
    if algorithm == "random_forest":
        return RandomForestClassifier(random_state=SEED, **parameters)
    if algorithm == "decision_tree":
        return DecisionTreeClassifier(random_state=SEED, **parameters)
    return KNeighborsClassifier(**parameters)


@dataclass
class ClassificationArtifact:
    """Pipeline e metadados persistidos juntos, preservando a origem do modelo."""

    pipeline: Pipeline
    result: dict
    numeric_ranges: dict
    crops: tuple
    seed: int = SEED
    sklearn_version: str = sklearn.__version__


def train_classification(df: pd.DataFrame, config: dict) -> ClassificationArtifact:
    """Treina a configuração solicitada e avalia num único teste estratificado."""
    df = validate_dataset(df).reset_index(drop=True)
    if len(df) < 15:
        raise ClassificationError("O treinamento exige pelo menos 15 registros.")
    if not isinstance(config, dict) or set(config) != {"dataset_id", "task", "algorithm", "hyperparameters"}:
        raise ClassificationError("Configuração de treinamento inválida.")
    if config["task"] != "classificacao":
        raise ClassificationError("A tarefa deve ser classificacao.")
    dataset_id = create_dataset_envelope(df, "treino")["dataset_id"]
    if config["dataset_id"] != dataset_id:
        raise ClassificationError("O dataset_id não corresponde ao conteúdo da base.")

    counts = df[TARGET].value_counts()
    observed_classes = [label for label in CLASSES if counts.get(label, 0) > 0]
    insufficient = [label for label in observed_classes if counts.get(label, 0) < 2]
    if insufficient:
        raise ClassificationError(f"Cada classe precisa de ao menos 2 registros para treino e teste: {', '.join(insufficient)}.")

    # A base pode representar apenas algumas classes (os exemplos atuais, por
    # exemplo, contêm uma classe). Preserve sempre a ordem completa no contrato.
    # Estratifique quando o teste comporta todas as classes observadas.
    test_count = int(np.ceil(len(df) * 0.2))
    train_count = len(df) - test_count
    stratify = df[TARGET] if test_count >= len(observed_classes) and train_count >= len(observed_classes) else None
    train, test = train_test_split(df, test_size=0.2, random_state=SEED, stratify=stratify)
    estimator = _estimator(config["algorithm"], config["hyperparameters"], len(train))
    pipeline = Pipeline([("preprocessing", create_preprocessor()), ("estimator", estimator)])
    pipeline.fit(train[FEATURES], train[TARGET])
    predicted = pipeline.predict(test[FEATURES])
    real = test[TARGET].to_numpy()
    matrix = confusion_matrix(real, predicted, labels=CLASSES)
    accuracy = float(accuracy_score(real, predicted))
    warnings = ["Dados sintéticos: aprender estes rótulos não comprova previsão de risco agrícola real."]
    missing_classes = [label for label in CLASSES if label not in observed_classes]
    if missing_classes:
        warnings.append(f"Classes ausentes na base de treino: {', '.join(missing_classes)}.")
    result = {
        "model_id": f"clf-{uuid4().hex}", "dataset_id": dataset_id,
        "config": deepcopy(config), "mode": "real", "train_size": len(train), "test_size": len(test),
        "metrics": {
            "accuracy": accuracy,
            "f1_weighted": float(f1_score(real, predicted, labels=CLASSES, average="weighted", zero_division=0)),
            "precision": float(precision_score(real, predicted, labels=CLASSES, average="weighted", zero_division=0)),
            "recall": float(recall_score(real, predicted, labels=CLASSES, average="weighted", zero_division=0)),
            "classes": CLASSES.copy(), "confusion_matrix": matrix.astype(int).tolist(),
        },
        "test_samples": [
            {"talhao_id": str(tid), "real": str(actual), "previsto": str(guess)}
            for tid, actual, guess in zip(test["talhao_id"], real, predicted)
        ],
        "warnings": warnings,
    }
    return ClassificationArtifact(
        pipeline, result,
        {name: (float(train[name].min()), float(train[name].max())) for name in NUMERIC_FEATURES},
        tuple(sorted(train["cultura"].unique())),
    )


def predict_classification(artifact: ClassificationArtifact, scenario: dict, *, dataset_id: str) -> dict:
    """Infere classe e probabilidades, quando disponíveis, sem novo treino."""
    if dataset_id != artifact.result["dataset_id"]:
        raise ClassificationError("O modelo pertence a outra base.")
    if not isinstance(scenario, dict) or set(scenario) != {*FEATURES, "municipio"}:
        raise ClassificationError("Informe município, cultura e as seis variáveis numéricas.")
    if not isinstance(scenario["municipio"], str) or not scenario["municipio"].strip():
        raise ClassificationError("O município é obrigatório.")
    if scenario["cultura"] not in artifact.crops:
        raise ClassificationError("A cultura não foi observada no treinamento.")
    warnings = []
    for name in NUMERIC_FEATURES:
        value = scenario[name]
        low, high = NUMERIC_LIMITS[name]
        if type(value) not in (int, float) or not np.isfinite(value) or not low <= value <= high:
            raise ClassificationError(f"Valor inválido para '{name}'.")
        observed_low, observed_high = artifact.numeric_ranges[name]
        if not observed_low <= value <= observed_high:
            warnings.append(f"{name}: valor fora do intervalo observado no treino [{observed_low}, {observed_high}].")
    features = pd.DataFrame([scenario])[FEATURES]
    predicted = str(artifact.pipeline.predict(features)[0])
    estimator = artifact.pipeline.named_steps["estimator"]
    probabilities = None
    if hasattr(artifact.pipeline, "predict_proba") and hasattr(estimator, "classes_"):
        raw = artifact.pipeline.predict_proba(features)[0]
        by_class = dict(zip(estimator.classes_, raw))
        probabilities = {label: float(by_class.get(label, 0.0)) for label in CLASSES}
    if predicted not in ALLOWED_RISKS:
        raise ClassificationError("O modelo produziu uma classe de risco inválida.")
    return {
        "dataset_id": dataset_id, "model_ids": {"classificacao": artifact.result["model_id"]},
        "produtividade_estimada_sc_ha": None, "risco_predito": predicted,
        "probabilidades": probabilities, "mode": "real", "warnings": warnings,
    }


def save_classification(artifact: ClassificationArtifact, path: str | Path) -> None:
    """Salva pipeline, configuração, métricas e identificação em um arquivo joblib."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(artifact, path)


def load_classification(path: str | Path) -> ClassificationArtifact:
    """Carrega somente artefatos confiáveis produzidos pela equipe."""
    artifact = joblib.load(path)
    if not isinstance(artifact, ClassificationArtifact):
        raise ClassificationError("Arquivo incompatível com o artefato de classificação.")
    if artifact.sklearn_version != sklearn.__version__:
        raise ClassificationError("Versão do scikit-learn diferente da utilizada no treinamento.")
    return artifact
