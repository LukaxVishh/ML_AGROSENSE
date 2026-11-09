"""Módulo de validação de esquema, limites físicos e cálculo de resumo estatístico.

Implementado pelo Dev 2 para garantir a integridade dos dados consumidos pela API e modelos.
"""

from __future__ import annotations

import hashlib
import json
from typing import Any

import numpy as np
import pandas as pd

COLUMNS_ORDER = [
    "talhao_id",
    "municipio",
    "latitude",
    "longitude",
    "cultura",
    "area_hectares",
    "precipitacao_mm",
    "temperatura_media",
    "umidade_solo_pct",
    "ph_solo",
    "teor_argila_pct",
    "produtividade_sc_ha",
    "risco_quebra",
]

ALLOWED_CROPS = {"Soja", "Milho", "Algodão"}
ALLOWED_RISKS = {"Baixo", "Moderado", "Alto"}

NUMERIC_LIMITS: dict[str, tuple[float, float]] = {
    "latitude": (-33.75, 5.27),
    "longitude": (-73.98, -34.79),
    "area_hectares": (1.0, 5000.0),
    "precipitacao_mm": (0.0, 3000.0),
    "temperatura_media": (10.0, 45.0),
    "umidade_solo_pct": (0.0, 100.0),
    "ph_solo": (3.5, 9.0),
    "teor_argila_pct": (0.0, 100.0),
    "produtividade_sc_ha": (0.0, 120.0),
}


class DataValidationError(ValueError):
    """Exceção disparada quando um conjunto de dados viola regras do contrato ou limites físicos."""


def validate_dataset(df: pd.DataFrame) -> pd.DataFrame:
    """Valida colunas, unicidade de IDs, tipos e limites físicos sobre o DataFrame."""
    if df is None or len(df) == 0:
        raise DataValidationError("O conjunto de dados não contém registros.")

    if len(df) > 10000:
        raise DataValidationError(
            f"O conjunto de dados excede o limite máximo permitido de 10.000 registros (encontrados: {len(df)})."
        )

    # 1. Conferência estrita de colunas
    cols = list(df.columns)
    if len(cols) != len(set(cols)):
        raise DataValidationError("O conjunto de dados possui nomes de colunas duplicados.")

    missing = [c for c in COLUMNS_ORDER if c not in cols]
    if missing:
        raise DataValidationError(f"Faltam colunas obrigatórias no conjunto de dados: {', '.join(missing)}.")

    extra = [c for c in cols if c not in COLUMNS_ORDER]
    if extra:
        raise DataValidationError(f"Colunas não reconhecidas no esquema: {', '.join(extra)}.")

    # Reordenar colunas conforme a especificação do contrato
    df = df[COLUMNS_ORDER].copy()

    # 2. Verificação de valores ausentes (NaN)
    if df.isna().any().any():
        null_cols = df.columns[df.isna().any()].tolist()
        raise DataValidationError(f"O conjunto de dados contém valores ausentes ou nulos nas colunas: {', '.join(null_cols)}.")

    # 3. Unicidade de talhao_id
    df["talhao_id"] = df["talhao_id"].astype(str).str.strip()
    if (df["talhao_id"] == "").any():
        raise DataValidationError("A coluna 'talhao_id' contém valores vazios.")

    duplicates = df[df["talhao_id"].duplicated()]["talhao_id"].unique()
    if len(duplicates) > 0:
        raise DataValidationError(f"Identificadores de talhão duplicados encontrados: {', '.join(map(str, duplicates[:5]))}.")

    # 4. Validação de texto em municipio
    df["municipio"] = df["municipio"].astype(str).str.strip()
    if (df["municipio"] == "").any():
        raise DataValidationError("A coluna 'municipio' contém registros vazios.")

    # 5. Validação de categorias permitidas
    invalid_crops = set(df["cultura"].unique()) - ALLOWED_CROPS
    if invalid_crops:
        raise DataValidationError(
            f"Culturas inválidas encontradas: {', '.join(invalid_crops)}. Permitidas: {', '.join(ALLOWED_CROPS)}."
        )

    invalid_risks = set(df["risco_quebra"].unique()) - ALLOWED_RISKS
    if invalid_risks:
        raise DataValidationError(
            f"Classes de risco inválidas encontradas: {', '.join(invalid_risks)}. Permitidas: {', '.join(ALLOWED_RISKS)}."
        )

    # 6. Validação de limites numéricos físicos
    for col, (min_val, max_val) in NUMERIC_LIMITS.items():
        if not np.issubdtype(df[col].dtype, np.number):
            raise DataValidationError(f"A coluna '{col}' deve conter valores estritamente numéricos finitos.")

        if np.isinf(df[col]).any():
            raise DataValidationError(f"A coluna '{col}' contém valores infinitos.")

        out_of_bounds = df[(df[col] < min_val) | (df[col] > max_val)]
        if len(out_of_bounds) > 0:
            first_val = out_of_bounds[col].iloc[0]
            first_id = out_of_bounds["talhao_id"].iloc[0]
            raise DataValidationError(
                f"Talhão '{first_id}': valor {first_val} na coluna '{col}' está fora do intervalo físico permitido [{min_val}, {max_val}]."
            )

    return df


def calculate_summary(df: pd.DataFrame) -> dict[str, Any]:
    """Calcula indicadores agregados no formato exato esperado pelo contrato."""
    total = int(len(df))
    if total == 0:
        return {
            "total_talhoes": 0,
            "area_total_ha": 0.0,
            "produtividade_media": None,
            "precipitacao_media": None,
            "culturas_contagem": {c: 0 for c in sorted(ALLOWED_CROPS)},
            "risco_contagem": {r: 0 for r in ["Baixo", "Moderado", "Alto"]},
        }

    culturas_contagem = {c: int((df["cultura"] == c).sum()) for c in ["Soja", "Milho", "Algodão"]}
    risco_contagem = {r: int((df["risco_quebra"] == r).sum()) for r in ["Baixo", "Moderado", "Alto"]}

    return {
        "total_talhoes": total,
        "area_total_ha": round(float(df["area_hectares"].sum()), 2),
        "produtividade_media": round(float(df["produtividade_sc_ha"].mean()), 2),
        "precipitacao_media": round(float(df["precipitacao_mm"].mean()), 2),
        "culturas_contagem": culturas_contagem,
        "risco_contagem": risco_contagem,
    }


def create_dataset_envelope(df: pd.DataFrame, filename: str) -> dict[str, Any]:
    """Empacota o DataFrame no envelope JSON exigido pelo contrato v1.0."""
    # Garante tipagem Python nativa nos registros
    records: list[dict[str, Any]] = []
    for r in df.to_dict(orient="records"):
        record: dict[str, Any] = {}
        for k, v in r.items():
            if k in NUMERIC_LIMITS:
                record[k] = float(v)
            else:
                record[k] = str(v)
        records.append(record)

    # Identificador determinístico baseado no hash SHA-256 do conteúdo dos registros
    serialized = json.dumps(records, sort_keys=True).encode("utf-8")
    content_hash = hashlib.sha256(serialized).hexdigest()[:20]
    dataset_id = f"ds-{content_hash}"

    return {
        "dataset_id": dataset_id,
        "filename": filename,
        "records": records,
        "summary": calculate_summary(df),
        "validation": {
            "columns_detected": 13,
            "warnings": [],
        },
        "mode": "real",
    }
