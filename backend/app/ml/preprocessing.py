"""Preditores compartilhados; cada tarefa deve ajustar seu próprio pipeline."""

from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

NUMERIC_FEATURES = [
    "area_hectares", "precipitacao_mm", "temperatura_media",
    "umidade_solo_pct", "ph_solo", "teor_argila_pct",
]
FEATURES = [*NUMERIC_FEATURES, "cultura"]


def create_preprocessor():
    """Cria um transformador novo, ainda sem ajuste aos dados."""
    return ColumnTransformer([
        ("numeric", Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]), NUMERIC_FEATURES),
        ("categorical", Pipeline([
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
        ]), ["cultura"]),
    ], remainder="drop")
