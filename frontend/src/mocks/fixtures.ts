import type { Crop, TalhaoRecord } from "../types";
import { riskRule, yieldRule } from "../lib/domain";
const cities = [
  ["Sorriso", -12.5425, -55.7211],
  ["Sinop", -11.8642, -55.5056],
  ["Cascavel", -24.9558, -53.4552],
  ["Rio Verde", -17.7925, -50.9192],
  ["Dourados", -22.2211, -54.8056],
  ["Campo Mourão", -24.0458, -52.3789],
] as const;
export function fixtures(count = 300, crop?: Crop): TalhaoRecord[] {
  let seed = 42;
  const random = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const round = (v: number, d = 2) => Number(v.toFixed(d));
  return Array.from({ length: count }, (_, i) => {
    const city = cities[i % cities.length];
    const stress = i % 3;
    const input = {
      municipio: city[0],
      cultura:
        crop || (["Soja", "Milho", "Algodão"] as Crop[])[Math.floor(i / 3) % 3],
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
    return {
      ...input,
      talhao_id: `TAL-${String(i + 1).padStart(4, "0")}`,
      latitude: round(city[1] + (random() - 0.5) * 0.12, 5),
      longitude: round(city[2] + (random() - 0.5) * 0.12, 5),
      produtividade_sc_ha: round(
        Math.max(0, Math.min(120, yieldRule(input) + (random() - 0.5) * 6)),
      ),
      risco_quebra: riskRule(input),
    };
  });
}
