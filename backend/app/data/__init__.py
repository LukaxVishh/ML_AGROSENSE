"""Módulo de dados do AgroSense (Dev 2).

Centraliza a ingestão, validação, sumarização e empacotamento das bases de dados.
"""

from app.data.loader import (
    DataLoadError,
    load_csv,
    load_dataset,
    load_json,
    load_xml,
)
from app.data.validator import (
    COLUMNS_ORDER,
    DataValidationError,
    calculate_summary,
    create_dataset_envelope,
    validate_dataset,
)

__all__ = [
    "DataLoadError",
    "DataValidationError",
    "COLUMNS_ORDER",
    "load_dataset",
    "load_csv",
    "load_json",
    "load_xml",
    "validate_dataset",
    "calculate_summary",
    "create_dataset_envelope",
]
