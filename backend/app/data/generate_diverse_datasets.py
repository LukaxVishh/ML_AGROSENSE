"""Script utilitário do Dev 2 para gerar bases diversas de avaliação acadêmica.

Cria cenários climáticos e agrícolas contrastantes para avaliar a capacidade
de recálculo e generalização do modelo de Machine Learning.
"""

from __future__ import annotations

import json
from pathlib import Path

COLUMNS = [
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


def generate_records(scenario: dict, count: int = 150) -> list[dict]:
    seed = 42

    def rand() -> float:
        nonlocal seed
        seed = (1664525 * seed + 1013904223) & 0xFFFFFFFF
        return seed / 4294967296.0

    records = []
    prefix = scenario["prefix"]

    for i in range(count):
        num_str = str(i + 1).zfill(4)
        tid = f"{prefix}-{num_str}"
        mun = scenario["municipio"](i)
        lat = round(scenario["base_lat"] + (rand() - 0.5) * 0.2, 5)
        lon = round(scenario["base_lon"] + (rand() - 0.5) * 0.2, 5)
        cult = scenario["cultura"](i)
        area = round(50 + rand() * 400, 1)

        chuva = round(scenario["chuva_min"] + rand() * (scenario["chuva_max"] - scenario["chuva_min"]), 1)
        temp = round(scenario["temp_min"] + rand() * (scenario["temp_max"] - scenario["temp_min"]), 1)
        umid = round(scenario["umid_min"] + rand() * (scenario["umid_max"] - scenario["umid_min"]), 1)
        ph = round(scenario["ph_min"] + rand() * (scenario["ph_max"] - scenario["ph_min"]), 1)
        argila = round(scenario["argila_min"] + rand() * (scenario["argila_max"] - scenario["argila_min"]), 1)

        # Cálculo didático consistente do estresse
        stress = (
            (max(0, 800 - chuva) / 800) * 0.45
            + (max(0, temp - 28) / 10) * 0.35
            + (max(0, 40 - umid) / 40) * 0.2
        )
        risco = "Alto" if stress >= 0.55 else ("Moderado" if stress >= 0.25 else "Baixo")

        prod = round(
            max(
                0.0,
                min(
                    120.0,
                    55
                    + 0.015 * (min(chuva, 1600) - 600)
                    - 1.2 * abs(temp - 24)
                    + 0.12 * umid
                    + 3.5 * (1 - abs(ph - 6.2))
                    + 0.08 * argila
                    + (rand() - 0.5) * 4,
                ),
            ),
            1,
        )

        records.append(
            {
                "talhao_id": tid,
                "municipio": mun,
                "latitude": lat,
                "longitude": lon,
                "cultura": cult,
                "area_hectares": area,
                "precipitacao_mm": chuva,
                "temperatura_media": temp,
                "umidade_solo_pct": umid,
                "ph_solo": ph,
                "teor_argila_pct": argila,
                "produtividade_sc_ha": prod,
                "risco_quebra": risco,
            }
        )
    return records


def generate_all_scenarios(root_dir: Path | None = None) -> list[str]:
    if root_dir is None:
        root_dir = Path(__file__).resolve().parent.parent.parent.parent

    data_dir = root_dir / "data" / "examples"
    pub_dir = root_dir / "frontend" / "public" / "examples"

    for d in [data_dir, pub_dir]:
        d.mkdir(parents=True, exist_ok=True)

    scenarios = [
        {
            "filename": "safra_soja_favoravel.csv",
            "prefix": "SOJ-FAV",
            "municipio": lambda i: "Sorriso" if i % 2 == 0 else "Sinop",
            "base_lat": -12.5425,
            "base_lon": -55.7211,
            "cultura": lambda i: "Soja",
            "chuva_min": 1300.0,
            "chuva_max": 1750.0,
            "temp_min": 22.0,
            "temp_max": 25.5,
            "umid_min": 60.0,
            "umid_max": 82.0,
            "ph_min": 6.0,
            "ph_max": 6.6,
            "argila_min": 42.0,
            "argila_max": 65.0,
            "fmt": "csv",
        },
        {
            "filename": "safra_milho_seca_severa.json",
            "prefix": "MIL-SEC",
            "municipio": lambda i: "Rio Verde" if i % 2 == 0 else "Dourados",
            "base_lat": -17.7925,
            "base_lon": -50.9192,
            "cultura": lambda i: "Milho",
            "chuva_min": 120.0,
            "chuva_max": 340.0,
            "temp_min": 32.0,
            "temp_max": 38.5,
            "umid_min": 8.0,
            "umid_max": 18.0,
            "ph_min": 5.2,
            "ph_max": 6.1,
            "argila_min": 25.0,
            "argila_max": 45.0,
            "fmt": "json",
        },
        {
            "filename": "safra_algodao_cerrado.xml",
            "prefix": "ALG-CER",
            "municipio": lambda i: "Rio Verde",
            "base_lat": -17.7925,
            "base_lon": -50.9192,
            "cultura": lambda i: "Algodão",
            "chuva_min": 850.0,
            "chuva_max": 1100.0,
            "temp_min": 26.5,
            "temp_max": 31.0,
            "umid_min": 35.0,
            "umid_max": 52.0,
            "ph_min": 4.9,
            "ph_max": 5.5,
            "argila_min": 16.0,
            "argila_max": 26.0,
            "fmt": "xml",
        },
        {
            "filename": "safra_mista_sul.csv",
            "prefix": "SUL-MIX",
            "municipio": lambda i: "Cascavel" if i % 2 == 0 else "Campo Mourão",
            "base_lat": -24.9558,
            "base_lon": -53.4552,
            "cultura": lambda i: "Soja" if i % 2 == 0 else "Milho",
            "chuva_min": 1250.0,
            "chuva_max": 1600.0,
            "temp_min": 17.5,
            "temp_max": 22.5,
            "umid_min": 58.0,
            "umid_max": 78.0,
            "ph_min": 5.8,
            "ph_max": 6.5,
            "argila_min": 45.0,
            "argila_max": 68.0,
            "fmt": "csv",
        },
    ]

    created = []
    for sc in scenarios:
        recs = generate_records(sc, count=150)
        fname = sc["filename"]
        fmt = sc["fmt"]

        if fmt == "csv":
            content = (
                ",".join(COLUMNS)
                + "\n"
                + "\n".join(",".join(str(r[c]) for c in COLUMNS) for r in recs)
                + "\n"
            )
        elif fmt == "json":
            content = json.dumps(recs, indent=2, ensure_ascii=False)
        else:
            lines = ['<?xml version="1.0" encoding="UTF-8"?>', "<talhoes>"]
            for r in recs:
                lines.append("  <talhao>")
                for c in COLUMNS:
                    lines.append(f"    <{c}>{r[c]}</{c}>")
                lines.append("  </talhao>")
            lines.append("</talhoes>\n")
            content = "\n".join(lines)

        for folder in [data_dir, pub_dir]:
            (folder / fname).write_text(content, encoding="utf-8")
        created.append(fname)

    return created


if __name__ == "__main__":
    bases = generate_all_scenarios()
    print(f"Bases geradas com sucesso: {', '.join(bases)}")
