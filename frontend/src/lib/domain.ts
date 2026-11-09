import type {
  Algorithm,
  Crop,
  DataSummary,
  PredictionInput,
  Risk,
  Sample,
  TalhaoRecord,
  Task,
  TrainConfig,
} from "../types";

export const columns = [
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
] as const;

export const CROPS: readonly Crop[] = ["Soja", "Milho", "Algodão"] as const;
export const RISKS: readonly Risk[] = ["Baixo", "Moderado", "Alto"] as const;

export const TASKS: Record<Task, string> = {
  regressao: "Regressão · Produtividade",
  classificacao: "Classificação · Risco",
};

export const ALGORITHMS: Record<Algorithm, string> = {
  random_forest: "Random Forest",
  decision_tree: "Árvore de Decisão",
  knn: "KNN",
};

export const numericRules = {
  area_hectares: [1, 5000],
  precipitacao_mm: [0, 3000],
  temperatura_media: [10, 45],
  umidade_solo_pct: [0, 100],
  ph_solo: [3.5, 9.0],
  teor_argila_pct: [0, 100],
} as const;

export const fieldLabels = {
  area_hectares: "Área (ha)",
  precipitacao_mm: "Precipitação (mm)",
  temperatura_media: "Temperatura (°C)",
  umidade_solo_pct: "Umidade do solo (%)",
  ph_solo: "pH do solo",
  teor_argila_pct: "Teor de argila (%)",
} as const;

export function format(value: number | null | undefined, digits = 0): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function riskRule(input: {
  precipitacao_mm: number;
  temperatura_media: number;
  umidade_solo_pct: number;
}): Risk {
  const stress =
    (Math.max(0, 800 - input.precipitacao_mm) / 800) * 0.45 +
    (Math.max(0, input.temperatura_media - 28) / 10) * 0.35 +
    (Math.max(0, 40 - input.umidade_solo_pct) / 40) * 0.2;
  return stress >= 0.55 ? "Alto" : stress >= 0.25 ? "Moderado" : "Baixo";
}

export function yieldRule(input: {
  precipitacao_mm: number;
  temperatura_media: number;
  umidade_solo_pct: number;
  ph_solo: number;
  teor_argila_pct: number;
}): number {
  return (
    55 +
    0.015 * (Math.min(input.precipitacao_mm, 1600) - 600) -
    1.2 * Math.abs(input.temperatura_media - 24) +
    0.12 * input.umidade_solo_pct +
    3.5 * (1 - Math.abs(input.ph_solo - 6.2)) +
    0.08 * input.teor_argila_pct
  );
}

export function summary(records: TalhaoRecord[]): DataSummary {
  const total = records.length;
  if (!total) {
    return {
      total_talhoes: 0,
      area_total_ha: 0,
      produtividade_media: null,
      precipitacao_media: null,
      culturas_contagem: { Soja: 0, Milho: 0, Algodão: 0 },
      risco_contagem: { Baixo: 0, Moderado: 0, Alto: 0 },
    };
  }
  let areaTotal = 0;
  let sumProd = 0;
  let sumChuva = 0;
  const culturas: Record<Crop, number> = { Soja: 0, Milho: 0, Algodão: 0 };
  const risco: Record<Risk, number> = { Baixo: 0, Moderado: 0, Alto: 0 };
  for (const r of records) {
    areaTotal += r.area_hectares;
    sumProd += r.produtividade_sc_ha;
    sumChuva += r.precipitacao_mm;
    if (r.cultura in culturas) culturas[r.cultura]++;
    if (r.risco_quebra in risco) risco[r.risco_quebra]++;
  }
  return {
    total_talhoes: total,
    area_total_ha: Number(areaTotal.toFixed(2)),
    produtividade_media: Number((sumProd / total).toFixed(2)),
    precipitacao_media: Number((sumChuva / total).toFixed(2)),
    culturas_contagem: culturas,
    risco_contagem: risco,
  };
}

export function validateRecords(records: unknown[]): TalhaoRecord[] {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("A base não contém registros válidos.");
  }
  const seenIds = new Set<string>();
  const validated: TalhaoRecord[] = [];

  for (let i = 0; i < records.length; i++) {
    const raw = records[i];
    if (!raw || typeof raw !== "object") {
      throw new Error(`Registro ${i + 1} inválido.`);
    }
    const r = raw as Record<string, unknown>;
    const missing = columns.filter((col) => !(col in r));
    if (missing.length) {
      throw new Error(`Registro ${i + 1}: faltam campos obrigatórios (${missing.join(", ")}).`);
    }

    const id = String(r.talhao_id || "").trim();
    if (!id) throw new Error(`Registro ${i + 1}: talhao_id inválido.`);
    if (seenIds.has(id)) throw new Error(`Registro ${i + 1}: talhao_id duplicado (${id}).`);
    seenIds.add(id);

    const lat = r.latitude;
    const lon = r.longitude;
    if (typeof lat !== "number" || !Number.isFinite(lat) || lat < -33.75 || lat > 5.27) {
      throw new Error(`Registro ${i + 1}: latitude fora do Brasil.`);
    }
    if (typeof lon !== "number" || !Number.isFinite(lon) || lon < -73.98 || lon > -34.79) {
      throw new Error(`Registro ${i + 1}: longitude fora do Brasil.`);
    }

    const crop = r.cultura as Crop;
    if (!CROPS.includes(crop)) {
      throw new Error(`Registro ${i + 1}: cultura inválida.`);
    }

    const risk = r.risco_quebra as Risk;
    if (!RISKS.includes(risk)) {
      throw new Error(`Registro ${i + 1}: risco_quebra inválido.`);
    }

    for (const [key, [min, max]] of Object.entries(numericRules)) {
      const val = r[key];
      if (typeof val !== "number" || !Number.isFinite(val) || val < min || val > max) {
        throw new Error(`Registro ${i + 1}: ${key} fora do intervalo [${min}, ${max}].`);
      }
    }

    const prod = r.produtividade_sc_ha;
    if (typeof prod !== "number" || !Number.isFinite(prod) || prod < 0 || prod > 120) {
      throw new Error(`Registro ${i + 1}: produtividade_sc_ha fora do intervalo [0, 120].`);
    }

    validated.push({
      talhao_id: id,
      municipio: String(r.municipio || "").trim(),
      latitude: lat,
      longitude: lon,
      cultura: crop,
      area_hectares: Number(r.area_hectares),
      precipitacao_mm: Number(r.precipitacao_mm),
      temperatura_media: Number(r.temperatura_media),
      umidade_solo_pct: Number(r.umidade_solo_pct),
      ph_solo: Number(r.ph_solo),
      teor_argila_pct: Number(r.teor_argila_pct),
      produtividade_sc_ha: prod,
      risco_quebra: risk,
    });
  }
  return validated;
}

export function validateInput(input: Record<string, unknown>): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.municipio || typeof input.municipio !== "string" || !input.municipio.trim()) {
    errors.municipio = "Informe o município.";
  }
  if (!input.cultura || !CROPS.includes(input.cultura as Crop)) {
    errors.cultura = "Selecione uma cultura válida.";
  }
  for (const [key, [min, max]] of Object.entries(numericRules)) {
    const val = input[key];
    if (typeof val === "boolean" || val === null || val === undefined || val === "" || typeof val !== "number" || !Number.isFinite(val)) {
      errors[key] = `Valor obrigatório entre ${min} e ${max}.`;
    } else if (val < min || val > max) {
      errors[key] = `Valor fora do intervalo permitido (${min} a ${max}).`;
    }
  }
  return errors;
}

export function validateConfig(config: TrainConfig, sampleSize: number): void {
  if (sampleSize < 15) {
    throw new Error("A base deve conter pelo menos 15 registros para treinamento.");
  }
  if (!["regressao", "classificacao"].includes(config.task)) {
    throw new Error("Tarefa inválida.");
  }
  if (!["random_forest", "decision_tree", "knn"].includes(config.algorithm)) {
    throw new Error("Algoritmo inválido.");
  }
  const h = config.hyperparameters;
  if (config.algorithm === "knn") {
    const neighbors = Number(h.n_neighbors);
    if (!neighbors || neighbors < 1 || neighbors > Math.floor(sampleSize * 0.8)) {
      throw new Error(`n_neighbors deve estar entre 1 e o tamanho do treino (${Math.floor(sampleSize * 0.8)}).`);
    }
  }
}

export function defaultConfig(
  dataset_id: string,
  task: Task = "regressao",
  algorithm: Algorithm = "random_forest",
): TrainConfig {
  let hyperparameters: Record<string, string | number> = {};
  if (algorithm === "random_forest") {
    hyperparameters = { n_estimators: 100, max_depth: 10, min_samples_split: 2 };
  } else if (algorithm === "decision_tree") {
    hyperparameters = {
      max_depth: 10,
      criterion: task === "regressao" ? "squared_error" : "gini",
    };
  } else {
    hyperparameters = { n_neighbors: 5, weights: "uniform", metric: "euclidean" };
  }
  return { dataset_id, task, algorithm, hyperparameters };
}

export function sameTrainConfig(a: TrainConfig, b: TrainConfig): boolean {
  if (a.dataset_id !== b.dataset_id || a.task !== b.task || a.algorithm !== b.algorithm) {
    return false;
  }
  const keysA = Object.keys(a.hyperparameters);
  const keysB = Object.keys(b.hyperparameters);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => String(a.hyperparameters[k]) === String(b.hyperparameters[k]));
}

export function mockEstimate(
  input: PredictionInput,
  config: TrainConfig,
): number | Risk {
  if (config.task === "regressao") {
    const base = yieldRule(input);
    return Number(Math.max(0, Math.min(120, base)).toFixed(1));
  }
  return riskRule(input);
}

export function regressionMetrics(samples: Sample[]): {
  r2: number;
  mae: number;
  rmse: number;
} {
  const n = samples.length;
  if (!n) return { mae: 0, rmse: 0, r2: 0 };
  let sumMae = 0;
  let sumSqErr = 0;
  let sumReal = 0;
  for (const s of samples) {
    const real = Number(s.real);
    const prev = Number(s.previsto);
    sumMae += Math.abs(real - prev);
    sumSqErr += (real - prev) ** 2;
    sumReal += real;
  }
  const meanReal = sumReal / n;
  let sumTot = 0;
  for (const s of samples) {
    sumTot += (Number(s.real) - meanReal) ** 2;
  }
  const mae = Number((sumMae / n).toFixed(2));
  const rmse = Number(Math.sqrt(sumSqErr / n).toFixed(2));
  const r2 = sumTot === 0 ? 1 : Number((1 - sumSqErr / sumTot).toFixed(2));
  return { mae, rmse, r2 };
}

export function classificationMetrics(samples: Sample[]): {
  accuracy: number;
  f1_weighted: number;
  precision: number;
  recall: number;
  classes: Risk[];
  confusion_matrix: number[][];
} {
  const classes: Risk[] = ["Baixo", "Moderado", "Alto"];
  const n = samples.length;
  const matrix = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  if (!n) {
    return {
      accuracy: 0,
      f1_weighted: 0,
      precision: 0,
      recall: 0,
      classes,
      confusion_matrix: matrix,
    };
  }
  let correct = 0;
  for (const s of samples) {
    const realIdx = classes.indexOf(s.real as Risk);
    const predIdx = classes.indexOf(s.previsto as Risk);
    if (realIdx >= 0 && predIdx >= 0) {
      matrix[realIdx][predIdx]++;
      if (realIdx === predIdx) correct++;
    }
  }
  const accuracy = Number((correct / n).toFixed(4));
  let sumPrec = 0;
  let sumRec = 0;
  let sumF1 = 0;

  for (let i = 0; i < classes.length; i++) {
    const tp = matrix[i][i];
    const actualTotal = matrix[i].reduce((a, b) => a + b, 0);
    const predTotal = matrix.reduce((sum, row) => sum + row[i], 0);

    const prec = predTotal ? tp / predTotal : 0;
    const rec = actualTotal ? tp / actualTotal : 0;
    const f1 = prec + rec > 0 ? (2 * prec * rec) / (prec + rec) : 0;

    const weight = actualTotal / n;
    sumPrec += prec * weight;
    sumRec += rec * weight;
    sumF1 += f1 * weight;
  }

  return {
    accuracy,
    f1_weighted: Number(sumF1.toFixed(2)),
    precision: Number(sumPrec.toFixed(2)),
    recall: Number(sumRec.toFixed(2)),
    classes,
    confusion_matrix: matrix,
  };
}

export function pearson(
  records: TalhaoRecord[],
  a: keyof TalhaoRecord,
  b: keyof TalhaoRecord,
): number {
  if (records.length < 2) return 0;
  const xs = records.map((r) => Number(r[a]));
  const ys = records.map((r) => Number(r[b]));
  const meanX = xs.reduce((s, x) => s + x, 0) / xs.length;
  const meanY = ys.reduce((s, y) => s + y, 0) / ys.length;
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < xs.length; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  if (denX === 0 || denY === 0) return 0;
  return Number((num / Math.sqrt(denX * denY)).toFixed(2));
}
