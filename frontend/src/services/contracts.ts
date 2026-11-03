import { z } from "zod";
import {
  columns,
  sameTrainConfig,
  summary,
  validateConfig,
  validateRecords,
} from "../lib/domain";
import type {
  Dataset,
  PredictionRequest,
  PredictionResult,
  TrainConfig,
  TrainingResult,
} from "../types";

const finite = z.number().finite();
const count = finite.int().nonnegative();
const text = z.string().trim().min(1);
const crop = z.enum(["Soja", "Milho", "Algodão"]);
const risk = z.enum(["Baixo", "Moderado", "Alto"]);
const task = z.enum(["regressao", "classificacao"]);
const rate = finite.min(0).max(1);
const configSchema = z.object({
  dataset_id: text,
  task,
  algorithm: z.enum(["random_forest", "decision_tree", "knn"]),
  hyperparameters: z.record(z.string(), z.union([finite, z.string()])),
});
const modelIds = z
  .object({ regressao: text.optional(), classificacao: text.optional() })
  .strict();
const datasetSchema = z.object({
  dataset_id: text,
  filename: text,
  records: z.array(z.unknown()).max(10000),
  summary: z.object({
    total_talhoes: count,
    area_total_ha: finite.nonnegative(),
    produtividade_media: finite.nullable(),
    precipitacao_media: finite.nullable(),
    culturas_contagem: z.record(crop, count),
    risco_contagem: z.record(risk, count),
  }),
  validation: z.object({
    columns_detected: z.literal(13),
    warnings: z.array(z.string()),
  }),
  mode: z.literal("real"),
});
const trainingSchema = z.object({
  model_id: text,
  dataset_id: text,
  config: configSchema,
  mode: z.literal("real"),
  train_size: count.positive(),
  test_size: count.positive(),
  metrics: z.object({
    r2: finite.nullable().optional(),
    mae: finite.nonnegative().optional(),
    rmse: finite.nonnegative().optional(),
    accuracy: rate.optional(),
    f1_weighted: rate.optional(),
    precision: rate.optional(),
    recall: rate.optional(),
    classes: z.array(risk).optional(),
    confusion_matrix: z.array(z.array(count)).optional(),
  }),
  test_samples: z.array(
    z.object({
      talhao_id: text,
      real: z.union([finite, risk]),
      previsto: z.union([finite, risk]),
    }),
  ),
  warnings: z.array(z.string()),
});
const predictionSchema = z.object({
  dataset_id: text,
  model_ids: modelIds,
  produtividade_estimada_sc_ha: finite.nullable(),
  risco_predito: risk.nullable(),
  probabilidades: z.record(risk, rate).nullable(),
  mode: z.literal("real"),
  warnings: z.array(z.string()),
});

export class ContractError extends Error {
  constructor(detail: string) {
    super(`Resposta incompatível com o contrato da API: ${detail}`);
  }
}
function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new ContractError(
      `campo ${issue.path.join(".") || "corpo"} inválido.`,
    );
  }
  return result.data;
}
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new ContractError(message);
}
function close(a: number | null, b: number | null) {
  return a === null || b === null ? a === b : Math.abs(a - b) <= 0.01;
}
export function parseHealth(value: unknown) {
  return parse(
    z.object({ status: z.literal("ok"), contract_version: z.literal("1.0") }),
    value,
  );
}
export function parseDataset(value: unknown, requestedId?: string): Dataset {
  const parsed = parse(datasetSchema, value);
  let records: Dataset["records"];
  try {
    records = parsed.records.length ? validateRecords(parsed.records) : [];
  } catch (error) {
    throw new ContractError((error as Error).message);
  }
  const expected = summary(records);
  assert(
    !requestedId || parsed.dataset_id === requestedId,
    "dataset_id diferente do solicitado.",
  );
  assert(
    parsed.validation.columns_detected === columns.length,
    "quantidade de colunas divergente.",
  );
  assert(
    parsed.summary.total_talhoes === records.length,
    "total de registros divergente.",
  );
  for (const key of [
    "area_total_ha",
    "produtividade_media",
    "precipitacao_media",
  ] as const)
    assert(
      close(parsed.summary[key], expected[key]),
      `resumo ${key} não corresponde aos registros.`,
    );
  for (const key of ["culturas_contagem", "risco_contagem"] as const)
    for (const [label, total] of Object.entries(expected[key]))
      assert(
        (parsed.summary[key] as Record<string, number>)[label] === total,
        `contagem ${label} divergente.`,
      );
  return { ...parsed, records };
}
export function parseTraining(
  value: unknown,
  requested: TrainConfig,
): TrainingResult {
  const parsed = parse(trainingSchema, value);
  assert(
    parsed.dataset_id === requested.dataset_id &&
      sameTrainConfig(parsed.config, requested),
    "configuração aplicada diferente da solicitada.",
  );
  try {
    validateConfig(parsed.config, parsed.train_size + parsed.test_size);
  } catch (error) {
    throw new ContractError((error as Error).message);
  }
  assert(
    parsed.test_samples.length === parsed.test_size,
    "amostras de auditoria incompletas.",
  );
  assert(
    new Set(parsed.test_samples.map((s) => s.talhao_id)).size ===
      parsed.test_size,
    "IDs repetidos na auditoria.",
  );
  const m = parsed.metrics;
  if (requested.task === "regressao") {
    assert(
      m.r2 !== undefined && m.mae !== undefined && m.rmse !== undefined,
      "faltam métricas de regressão.",
    );
    assert(
      parsed.test_samples.every(
        (s) => typeof s.real === "number" && typeof s.previsto === "number",
      ),
      "regressão exige valores numéricos na auditoria.",
    );
  } else {
    assert(
      m.accuracy !== undefined &&
        m.f1_weighted !== undefined &&
        m.precision !== undefined &&
        m.recall !== undefined,
      "faltam métricas de classificação.",
    );
    assert(
      m.classes?.length === 3 && new Set(m.classes).size === 3,
      "as três classes devem ser explícitas e únicas.",
    );
    assert(
      m.confusion_matrix?.length === 3 &&
        m.confusion_matrix.every((row) => row.length === 3),
      "matriz de confusão deve ter dimensão 3×3.",
    );
    const matrix = m.classes.map(() => m.classes!.map(() => 0));
    for (const sample of parsed.test_samples) {
      const real = m.classes.indexOf(sample.real as z.infer<typeof risk>);
      const predicted = m.classes.indexOf(
        sample.previsto as z.infer<typeof risk>,
      );
      assert(real >= 0 && predicted >= 0, "auditoria contém classe inválida.");
      matrix[real][predicted]++;
    }
    assert(
      matrix.every((row, i) =>
        row.every((n, j) => n === m.confusion_matrix![i][j]),
      ),
      "matriz não corresponde à auditoria.",
    );
    const accuracy =
      matrix.reduce((sum, row, i) => sum + row[i], 0) / parsed.test_size;
    assert(
      Math.abs(m.accuracy - accuracy) <= 0.0001,
      "acurácia não corresponde à matriz.",
    );
  }
  return parsed;
}
export function parsePrediction(
  value: unknown,
  requested: PredictionRequest,
): PredictionResult {
  const parsed = parse(predictionSchema, value);
  assert(parsed.dataset_id === requested.dataset_id, "previsão de outra base.");
  for (const key of ["regressao", "classificacao"] as const)
    assert(
      parsed.model_ids[key] === requested.model_ids[key],
      "previsão de outro modelo.",
    );
  assert(
    !!requested.model_ids.regressao ===
      (parsed.produtividade_estimada_sc_ha !== null),
    "resultado de regressão incompatível com a tarefa solicitada.",
  );
  assert(
    !!requested.model_ids.classificacao === (parsed.risco_predito !== null),
    "resultado de classificação incompatível com a tarefa solicitada.",
  );
  if (parsed.probabilidades) {
    assert(parsed.risco_predito !== null, "probabilidades sem classificação.");
    assert(
      Math.abs(
        Object.values(parsed.probabilidades).reduce((a, b) => a + b, 0) - 1,
      ) <= 0.0001,
      "probabilidades não somam 1.",
    );
  }
  return parsed;
}
