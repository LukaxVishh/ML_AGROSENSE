"""Testes unitários e de integração do Módulo de Dados (Dev 2).

Valida carregamento de CSV, JSON e XML, integridade do esquema de 13 colunas,
limites físicos e geração de resumos estatísticos.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pytest

from app.data.loader import (
    DataLoadError,
    DataSchemaError,
    load_csv,
    load_dataset,
    load_json,
    load_xml,
)
from app.data.validator import (
    DataValidationError,
    calculate_summary,
    create_dataset_envelope,
    validate_dataset,
)

EXAMPLES_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "examples"


class TestLoader:
    def test_load_csv_examples(self):
        csv_file = EXAMPLES_DIR / "safra_soja_favoravel.csv"
        df = load_csv(csv_file)
        assert len(df) == 150
        assert df["talhao_id"].iloc[0].startswith("SOJ-FAV")
        assert np.issubdtype(df["produtividade_sc_ha"].dtype, np.number)

    def test_load_csv_semicolon(self):
        content = "talhao_id;municipio;latitude;longitude;cultura;area_hectares;precipitacao_mm;temperatura_media;umidade_solo_pct;ph_solo;teor_argila_pct;produtividade_sc_ha;risco_quebra\nT-1;Sorriso;-12.5;-55.7;Soja;100;1400;25.0;60.0;6.0;50.0;80.0;Baixo\n"
        df = load_csv(content)
        assert len(df) == 1
        assert df["municipio"].iloc[0] == "Sorriso"
        assert df["area_hectares"].iloc[0] == 100.0

    def test_load_json_examples(self):
        json_file = EXAMPLES_DIR / "safra_milho_seca_severa.json"
        df = load_json(json_file)
        assert len(df) == 150
        assert df["cultura"].iloc[0] == "Milho"
        assert np.issubdtype(df["temperatura_media"].dtype, np.number)

    def test_load_json_invalid(self):
        with pytest.raises(DataLoadError, match="JSON malformado"):
            load_json("{invalid_json}")
        with pytest.raises(DataLoadError, match="array de registros"):
            load_json('{"chave": "valor"}')
        with pytest.raises(DataLoadError, match="não contém registros"):
            load_json("[]")

    def test_load_json_requires_native_json_types(self):
        with pytest.raises(DataSchemaError, match="número JSON finito"):
            load_json('[{"area_hectares": "100"}]')
        with pytest.raises(DataSchemaError, match="texto JSON"):
            load_json('[{"municipio": 123}]')
        with pytest.raises(DataSchemaError, match="deve ser um objeto"):
            load_json("[1]")

    def test_load_xml_examples(self):
        xml_file = EXAMPLES_DIR / "safra_algodao_cerrado.xml"
        df = load_xml(xml_file)
        assert len(df) == 150
        assert df["cultura"].iloc[0] == "Algodão"
        assert df["ph_solo"].iloc[0] < 6.0

    def test_load_xml_security_rejects_dtd_and_entities(self):
        bad_xml = '<!DOCTYPE talhoes [<!ENTITY x "xxe">]><talhoes><talhao><talhao_id>&x;</talhao_id></talhao></talhoes>'
        with pytest.raises(DataLoadError, match="DTD ou entidades externas"):
            load_xml(bad_xml)

    def test_load_xml_security_rejects_attributes_and_nested_tags(self):
        # Atributo na raiz
        with pytest.raises(DataLoadError, match="não deve conter atributos"):
            load_xml('<talhoes extra="1"><talhao></talhao></talhoes>')

        # Nós aninhados em campos
        nested_xml = """<talhoes>
          <talhao>
            <ph_solo><valor>6.0</valor></ph_solo>
          </talhao>
        </talhoes>"""
        with pytest.raises(DataLoadError, match="elementos aninhados"):
            load_xml(nested_xml)

    def test_load_dataset_dispatch(self):
        csv_file = EXAMPLES_DIR / "safra_mista_sul.csv"
        df = load_dataset(csv_file, "csv")
        assert len(df) == 150
        assert "Milho" in df["cultura"].values
        assert "Soja" in df["cultura"].values

    def test_load_dataset_infers_format_for_long_file_content(self):
        csv_file = EXAMPLES_DIR / "safra_mista_sul.csv"
        assert len(load_dataset(csv_file)) == 150
        assert len(load_dataset(csv_file.read_text(encoding="utf-8"))) == 150


class TestValidator:
    @pytest.fixture
    def valid_df(self):
        return load_csv(EXAMPLES_DIR / "safra_soja_favoravel.csv")

    def test_validate_valid_dataset(self, valid_df):
        validated = validate_dataset(valid_df)
        assert len(validated) == len(valid_df)

    def test_validate_rejects_missing_columns(self, valid_df):
        incomplete = valid_df.drop(columns=["produtividade_sc_ha"])
        with pytest.raises(DataValidationError, match="Faltam colunas obrigatórias"):
            validate_dataset(incomplete)

    def test_validate_rejects_extra_columns(self, valid_df):
        with_extra = valid_df.copy()
        with_extra["coluna_fantasma"] = 123
        with pytest.raises(DataValidationError, match="Colunas não reconhecidas"):
            validate_dataset(with_extra)

    def test_validate_rejects_duplicate_ids(self, valid_df):
        dup = valid_df.copy()
        dup.iloc[1, dup.columns.get_loc("talhao_id")] = dup.iloc[0]["talhao_id"]
        with pytest.raises(DataValidationError, match="duplicados encontrados"):
            validate_dataset(dup)

    def test_validate_rejects_nulls(self, valid_df):
        with_null = valid_df.copy()
        with_null.iloc[0, with_null.columns.get_loc("ph_solo")] = np.nan
        with pytest.raises(DataValidationError, match="valores ausentes ou nulos"):
            validate_dataset(with_null)

    def test_validate_rejects_out_of_bounds(self, valid_df):
        # ph_solo fora do limite permitido [3.5, 9.0]
        invalid_ph = valid_df.copy()
        invalid_ph.iloc[0, invalid_ph.columns.get_loc("ph_solo")] = 12.0
        with pytest.raises(DataValidationError, match="fora do intervalo físico permitido"):
            validate_dataset(invalid_ph)

        # latitude fora do Brasil
        invalid_lat = valid_df.copy()
        invalid_lat.iloc[0, invalid_lat.columns.get_loc("latitude")] = 45.0
        with pytest.raises(DataValidationError, match="fora do intervalo físico permitido"):
            validate_dataset(invalid_lat)

    def test_validate_rejects_invalid_crop_or_risk(self, valid_df):
        invalid_crop = valid_df.copy()
        invalid_crop.iloc[0, invalid_crop.columns.get_loc("cultura")] = "Cana"
        with pytest.raises(DataValidationError, match="Culturas inválidas"):
            validate_dataset(invalid_crop)

        invalid_risk = valid_df.copy()
        invalid_risk.iloc[0, invalid_risk.columns.get_loc("risco_quebra")] = "Critico"
        with pytest.raises(DataValidationError, match="Classes de risco inválidas"):
            validate_dataset(invalid_risk)


class TestSummaryAndEnvelope:
    def test_calculate_summary(self):
        df = load_csv(EXAMPLES_DIR / "safra_soja_favoravel.csv")
        validated = validate_dataset(df)
        summary = calculate_summary(validated)

        assert summary["total_talhoes"] == 150
        assert summary["area_total_ha"] > 0
        assert summary["produtividade_media"] > 70.0  # Safra favorável
        assert summary["culturas_contagem"]["Soja"] == 150
        assert summary["culturas_contagem"]["Milho"] == 0
        assert summary["risco_contagem"]["Baixo"] > 100

    def test_create_dataset_envelope(self):
        df = load_json(EXAMPLES_DIR / "safra_milho_seca_severa.json")
        validated = validate_dataset(df)
        envelope = create_dataset_envelope(validated, "safra_milho_seca_severa.json")

        assert envelope["dataset_id"].startswith("ds-")
        assert envelope["filename"] == "safra_milho_seca_severa.json"
        assert envelope["mode"] == "real"
        assert envelope["validation"]["columns_detected"] == 13
        assert len(envelope["records"]) == 150
        assert envelope["summary"]["total_talhoes"] == 150
        assert envelope["summary"]["risco_contagem"]["Alto"] > 50  # Seca severa
