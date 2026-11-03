import type {
  AgroService,
  Dataset,
  TrainingResult,
  TrainConfig,
} from "../types";
import {
  classificationMetrics,
  columns,
  mockEstimate,
  regressionMetrics,
  summary,
  validateConfig,
  validateInput,
} from "../lib/domain";
import { fixtures } from "../mocks/fixtures";
import { parseFile } from "./parser";
const datasets = new Map<string, Dataset>();
const models = new Map<string, TrainingResult>();
let sequence = 0;
const delay = () => new Promise((resolve) => setTimeout(resolve, 350));
async function dataset(
  records: Dataset["records"],
  filename: string,
): Promise<Dataset> {
  const bytes = new TextEncoder().encode(JSON.stringify(records));
  const hash = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
  )
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 20);
  const result: Dataset = {
    dataset_id: `ds-${hash}`,
    filename,
    records,
    summary: summary(records),
    validation: {
      columns_detected: columns.length,
      warnings: [
        "Dados locais em modo demonstração. Treinamento e inferência são simulados.",
      ],
    },
    mode: "mock",
  };
  datasets.set(result.dataset_id, result);
  return result;
}
function getDataset(id: string) {
  const data = datasets.get(id);
  if (!data)
    throw new Error("Base não encontrada. Carregue novamente os dados.");
  return data;
}
export const mockService: AgroService = {
  async health() {
    return { status: "ok", contract_version: "1.0" };
  },
  async fetchData(id) {
    await delay();
    if (id?.startsWith("ds-")) return getDataset(id);
    if (id === "demo-empty") return dataset([], "Base vazia · demonstração");
    const crop =
      id === "demo-soja"
        ? "Soja"
        : id === "demo-milho"
          ? "Milho"
          : id === "demo-algodao"
            ? "Algodão"
            : undefined;
    return dataset(
      fixtures(300, crop),
      crop ? `Demonstração · ${crop}` : "Base agrícola demonstrativa",
    );
  },
  async uploadDataset(file) {
    const records = await parseFile(file);
    await delay();
    return dataset(records, file.name);
  },
  async train(config: TrainConfig) {
    const data = getDataset(config.dataset_id);
    validateConfig(config, data.records.length);
    await delay();
    const test = data.records.filter((_, i) => i % 5 === 0);
    const samples = test.map((record) => ({
      talhao_id: record.talhao_id,
      real:
        config.task === "regressao"
          ? record.produtividade_sc_ha
          : record.risco_quebra,
      previsto: mockEstimate(record, config),
    }));
    const result: TrainingResult = {
      model_id: `mock-${++sequence}`,
      dataset_id: data.dataset_id,
      config: structuredClone(config),
      mode: "mock",
      train_size: data.records.length - test.length,
      test_size: test.length,
      metrics:
        config.task === "regressao"
          ? regressionMetrics(samples)
          : classificationMetrics(samples),
      test_samples: samples,
      warnings: [
        "Simulação de contrato: os algoritmos não são treinados no navegador. As métricas descrevem as saídas da regra demonstrativa sobre a fixture.",
      ],
    };
    models.set(result.model_id, result);
    return result;
  },
  async predict(request) {
    const data = getDataset(request.dataset_id);
    const errors = validateInput(request.input);
    if (Object.keys(errors).length)
      throw new Error(Object.values(errors).join(" "));
    if (
      !data.records.some((record) => record.cultura === request.input.cultura)
    )
      throw new Error(
        "A cultura não possui exemplos na base usada para treinar este modelo.",
      );
    if (!request.model_ids.regressao && !request.model_ids.classificacao)
      throw new Error(
        "Simule o treinamento de pelo menos uma tarefa antes da previsão.",
      );
    const result = {
      dataset_id: request.dataset_id,
      model_ids: request.model_ids,
      produtividade_estimada_sc_ha: null as number | null,
      risco_predito: null as import("../types").Risk | null,
      probabilidades: null,
      mode: "mock" as const,
      warnings: [
        "Resultado demonstrativo calculado por regra didática; não é inferência de um modelo de machine learning.",
      ],
    };
    for (const [task, id] of Object.entries(request.model_ids)) {
      const model = models.get(id!);
      if (
        !model ||
        model.dataset_id !== request.dataset_id ||
        model.config.task !== task
      )
        throw new Error(
          "Modelo incompatível com a base ou tarefa. Treine novamente.",
        );
      const value = mockEstimate(request.input, model.config);
      if (task === "regressao")
        result.produtividade_estimada_sc_ha = value as number;
      else result.risco_predito = value as import("../types").Risk;
    }
    await delay();
    return result;
  },
};
