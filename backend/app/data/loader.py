"""Módulo de ingestão de arquivos agrícolas nos formatos CSV, JSON e XML.

Implementado pelo Dev 2 para normalização de bases de dados do AgroSense.
"""

from __future__ import annotations

import io
import json
import math
from pathlib import Path
from typing import Any, BinaryIO, TextIO, Union

import defusedxml.ElementTree as ET
import pandas as pd


class DataLoadError(ValueError):
    """Exceção disparada quando um arquivo não pode ser lido ou estruturado."""


class DataSchemaError(DataLoadError):
    """Exceção disparada quando os tipos declarados no arquivo violam o contrato."""


NUMERIC_COLUMNS = {
    "latitude",
    "longitude",
    "area_hectares",
    "precipitacao_mm",
    "temperatura_media",
    "umidade_solo_pct",
    "ph_solo",
    "teor_argila_pct",
    "produtividade_sc_ha",
}
TEXT_COLUMNS = {"talhao_id", "municipio", "cultura", "risco_quebra"}


def _read_content_as_text(source: Union[str, bytes, Path, BinaryIO, TextIO]) -> str:
    """Extrai o conteúdo bruto em string decodificada em UTF-8."""
    if isinstance(source, (str, Path)):
        try:
            is_file = Path(source).is_file()
        except (OSError, ValueError):
            # Uma string pode ser o conteúdo completo, não um nome de arquivo.
            if isinstance(source, Path):
                raise
            is_file = False
        if is_file:
            with open(source, mode="r", encoding="utf-8") as f:
                return f.read()
    if isinstance(source, bytes):
        try:
            return source.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise DataLoadError("O arquivo deve estar codificado em UTF-8 válido.") from exc
    if isinstance(source, str):
        return source
    if hasattr(source, "read"):
        content = source.read()
        if isinstance(content, bytes):
            return content.decode("utf-8")
        return str(content)
    raise DataLoadError("Origem de dados inválida para leitura.")


def load_csv(source: Union[str, bytes, Path, BinaryIO, TextIO]) -> pd.DataFrame:
    """Lê arquivo CSV normalizando separadores e tipos numéricos."""
    text = _read_content_as_text(source).strip()
    if not text:
        raise DataLoadError("O arquivo CSV está vazio.")

    # Detecção de delimitador (vírgula ou ponto e vírgula)
    delimiter = ";" if ";" in text.splitlines()[0] and "," not in text.splitlines()[0] else ","

    try:
        df = pd.read_csv(
            io.StringIO(text),
            sep=delimiter,
            encoding="utf-8",
            dtype=str,  # Leitura inicial como texto para conversão controlada
        )
    except Exception as exc:
        raise DataLoadError(f"CSV inválido ou malformado: {exc}") from exc

    # Limpeza de cabeçalhos
    df.columns = [str(c).strip().replace("\ufeff", "") for c in df.columns]

    # Conversão de colunas numéricas
    for col in NUMERIC_COLUMNS:
        if col in df.columns:
            try:
                df[col] = pd.to_numeric(df[col].astype(str).str.strip().str.replace(",", "."))
            except Exception as exc:
                raise DataLoadError(f"Coluna '{col}' contém valores numéricos inválidos.") from exc

    return df


def load_json(source: Union[str, bytes, Path, BinaryIO, TextIO]) -> pd.DataFrame:
    """Lê arquivo JSON esperando um array raiz de registros."""
    text = _read_content_as_text(source).strip()
    if not text:
        raise DataLoadError("O arquivo JSON está vazio.")

    try:
        data = json.loads(text)
    except Exception as exc:
        raise DataLoadError("JSON malformado. O arquivo deve conter uma estrutura JSON válida.") from exc

    if not isinstance(data, list):
        raise DataLoadError("JSON inválido: a estrutura raiz deve ser um array de registros.")

    if not data:
        raise DataLoadError("O arquivo JSON não contém registros.")

    # O contrato exige números JSON nativos: "100" é texto e deve falhar, enquanto
    # CSV e XML continuam convertendo valores textuais por não terem tipagem.
    # `type(...) not in (int, float)` também descarta bool, que é subclasse de int.
    for index, record in enumerate(data, start=1):
        if not isinstance(record, dict):
            raise DataSchemaError(f"Registro {index}: cada item do JSON deve ser um objeto.")
        for column in NUMERIC_COLUMNS & record.keys():
            value = record[column]
            if type(value) not in (int, float) or (type(value) is float and not math.isfinite(value)):
                raise DataSchemaError(
                    f"Registro {index}: o campo '{column}' deve ser um número JSON finito."
                )
        for column in TEXT_COLUMNS & record.keys():
            if not isinstance(record[column], str):
                raise DataSchemaError(
                    f"Registro {index}: o campo '{column}' deve ser um texto JSON."
                )

    df = pd.DataFrame(data)

    # Normalização de inteiros e floats JSON para colunas numéricas do DataFrame.
    # Sem `errors="coerce"`: os tipos já foram conferidos acima e um erro silencioso
    # viraria NaN, mascarando um arquivo fora do contrato.
    for col in NUMERIC_COLUMNS:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col])

    return df


def load_xml(source: Union[str, bytes, Path, BinaryIO, TextIO]) -> pd.DataFrame:
    """Lê arquivo XML estruturado em <talhoes><talhao> de forma segura contra XXE."""
    text = _read_content_as_text(source).strip()
    if not text:
        raise DataLoadError("O arquivo XML está vazio.")

    if "<!DOCTYPE" in text.upper() or "<!ENTITY" in text.upper():
        raise DataLoadError("XML com DTD ou entidades externas não é aceito por motivos de segurança.")

    try:
        root = ET.fromstring(text)
    except Exception as exc:
        raise DataLoadError(f"XML inválido ou malformado: {exc}") from exc

    if root.tag != "talhoes":
        raise DataLoadError("A raiz do XML deve ser estritamente <talhoes>.")

    if len(root.attrib) > 0:
        raise DataLoadError("A tag raiz <talhoes> não deve conter atributos.")

    records: list[dict[str, Any]] = []

    for idx, talhao_node in enumerate(root):
        if talhao_node.tag != "talhao":
            raise DataLoadError(f"Elemento inesperado '<{talhao_node.tag}>' na raiz do XML.")

        if len(talhao_node.attrib) > 0:
            raise DataLoadError(f"Talhão {idx + 1}: nós <talhao> não devem possuir atributos.")

        row: dict[str, Any] = {}
        tags_seen = set()

        for field in talhao_node:
            if field.tag in tags_seen:
                raise DataLoadError(f"Talhão {idx + 1}: campo repetido '<{field.tag}>'.")
            tags_seen.add(field.tag)

            if len(field.attrib) > 0 or len(field) > 0:
                raise DataLoadError(
                    f"Talhão {idx + 1}: campo '<{field.tag}>' não deve conter atributos ou elementos aninhados."
                )

            val = (field.text or "").strip()
            if field.tag in NUMERIC_COLUMNS:
                try:
                    row[field.tag] = float(val.replace(",", "."))
                except ValueError as exc:
                    raise DataLoadError(
                        f"Talhão {idx + 1}: valor não numérico no campo '<{field.tag}>': '{val}'."
                    ) from exc
            else:
                row[field.tag] = val

        records.append(row)

    if not records:
        raise DataLoadError("O arquivo XML não contém elementos <talhao>.")

    return pd.DataFrame(records)


def load_dataset(
    source: Union[str, bytes, Path, BinaryIO, TextIO],
    filename_or_format: str = "",
) -> pd.DataFrame:
    """Despacha a leitura do dataset de acordo com a extensão ou formato especificado."""
    fmt = filename_or_format.lower().strip()
    if "." in fmt:
        fmt = fmt.split(".")[-1]

    if fmt == "csv":
        return load_csv(source)
    if fmt == "json":
        return load_json(source)
    if fmt == "xml":
        return load_xml(source)

    # Tentativa de inferência caso o formato não tenha sido informado
    content = _read_content_as_text(source).strip()
    if content.startswith("<"):
        return load_xml(content)
    if content.startswith("[") or content.startswith("{"):
        return load_json(content)
    if "," in content.splitlines()[0] or ";" in content.splitlines()[0]:
        return load_csv(content)

    raise DataLoadError("Formato de arquivo não suportado. Utilize .csv, .json ou .xml.")
