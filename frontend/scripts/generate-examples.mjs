import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const output = fileURLToPath(new URL("../public/examples/", import.meta.url));
const shared = fileURLToPath(new URL("../../data/examples/", import.meta.url));
for (const path of [output, shared]) mkdirSync(path, { recursive: true });
const columns = [
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
];
function generate(crop) {
  let seed = 42;
  const random = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const round = (v, d = 2) => Number(v.toFixed(d));
  return Array.from({ length: 300 }, (_, i) => {
    const stress = i % 3;
    const r = {
      talhao_id: `${crop === "Soja" ? "SOJ" : crop === "Milho" ? "MIL" : "ALG"}-${String(i + 1).padStart(4, "0")}`,
      municipio:
        crop === "Soja"
          ? "Sorriso"
          : crop === "Milho"
            ? "Cascavel"
            : "Rio Verde",
      latitude: round(
        (crop === "Soja" ? -12.5425 : crop === "Milho" ? -24.9558 : -17.7925) +
          (random() - 0.5) * 0.3,
        5,
      ),
      longitude: round(
        (crop === "Soja" ? -55.7211 : crop === "Milho" ? -53.4552 : -50.9192) +
          (random() - 0.5) * 0.3,
        5,
      ),
      cultura: crop,
      area_hectares: round(40 + random() * 420),
      precipitacao_mm: round(
        stress === 0
          ? 1100 + random() * 700
          : stress === 1
            ? 400 + random() * 400
            : random() * 200,
      ),
      temperatura_media: round(
        stress === 0
          ? 22 + random() * 5
          : stress === 1
            ? 29 + random() * 6
            : 37 + random() * 7,
      ),
      umidade_solo_pct: round(
        stress === 0
          ? 50 + random() * 35
          : stress === 1
            ? 20 + random() * 25
            : random() * 12,
      ),
      ph_solo: round(4.8 + random() * 2.2),
      teor_argila_pct: round(15 + random() * 55),
    };
    const stressIndex =
      (Math.max(0, 800 - r.precipitacao_mm) / 800) * 0.45 +
      (Math.max(0, r.temperatura_media - 28) / 10) * 0.35 +
      (Math.max(0, 40 - r.umidade_solo_pct) / 40) * 0.2;
    r.risco_quebra =
      stressIndex >= 0.55 ? "Alto" : stressIndex >= 0.25 ? "Moderado" : "Baixo";
    r.produtividade_sc_ha = round(
      Math.max(
        0,
        Math.min(
          120,
          55 +
            0.015 * (Math.min(r.precipitacao_mm, 1600) - 600) -
            1.2 * Math.abs(r.temperatura_media - 24) +
            0.12 * r.umidade_solo_pct +
            3.5 * (1 - Math.abs(r.ph_solo - 6.2)) +
            0.08 * r.teor_argila_pct +
            (random() - 0.5) * 6,
        ),
      ),
    );
    return r;
  });
}
const datasets = [
  ["safra_soja.csv", generate("Soja")],
  ["safra_milho.json", generate("Milho")],
  ["safra_algodao.xml", generate("Algodão")],
];
for (const [name, records] of datasets) {
  const content = name.endsWith("csv")
    ? columns.join(",") +
      "\n" +
      records.map((r) => columns.map((k) => r[k]).join(",")).join("\n") +
      "\n"
    : name.endsWith("json")
      ? JSON.stringify(records, null, 2)
      : '<?xml version="1.0" encoding="UTF-8"?>\n<talhoes>\n' +
        records
          .map(
            (r) =>
              "  <talhao>\n" +
              columns.map((k) => `    <${k}>${r[k]}</${k}>`).join("\n") +
              "\n  </talhao>",
          )
          .join("\n") +
        "\n</talhoes>\n";
  for (const path of [output, shared])
    writeFileSync(path + name, content, "utf8");
  console.log(`${name}: ${records.length} registros sintéticos`);
}
