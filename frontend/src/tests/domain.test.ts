import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  classificationMetrics,
  defaultConfig,
  regressionMetrics,
  riskRule,
  summary,
  validateInput,
  validateRecords,
} from "../lib/domain";
import { fixtures } from "../mocks/fixtures";
import { parseText } from "../services/parser";
import { mockService } from "../services/mockService";

describe("Dados e ingestão", () => {
  it("gera 300 registros determinísticos e válidos", () => {
    expect(fixtures()).toEqual(fixtures());
    expect(validateRecords(fixtures())).toHaveLength(300);
    expect(new Set(fixtures().map((r) => r.talhao_id)).size).toBe(300);
  });
  it("retorna resumo vazio sem NaN ou médias fictícias", () => {
    expect(summary([]).produtividade_media).toBeNull();
    expect(summary([]).total_talhoes).toBe(0);
  });
  it("rejeita IDs duplicados, campos ausentes, strings numéricas e coordenadas inválidas", () => {
    const [record] = fixtures();
    expect(() => validateRecords([record, record])).toThrow("duplicado");
    const { ph_solo, ...missing } = record;
    expect(() => validateRecords([missing])).toThrow("faltam");
    expect(() => validateRecords([{ ...record, ph_solo: "6.1" }])).toThrow();
    expect(() => validateRecords([{ ...record, latitude: 90 }])).toThrow();
  });
  it("lê CSV e JSON reais de exemplo", () => {
    const csv = readFileSync(
      new URL("../../public/examples/safra_soja.csv", import.meta.url),
      "utf8",
    );
    const json = readFileSync(
      new URL("../../public/examples/safra_milho.json", import.meta.url),
      "utf8",
    );
    expect(parseText(csv, "csv")).toHaveLength(300);
    expect(parseText(json, "json")).toHaveLength(300);
    expect(() => parseText("[invalid", "json")).toThrow("malformado");
    expect(() => parseText("[]", "json")).toThrow("não contém");
  });
  it("aplica limites e rejeita vazio e booleanos no simulador", () => {
    const [record] = fixtures();
    expect(validateInput({ ...record })).toEqual({});
    expect(
      validateInput({
        ...record,
        ph_solo: null,
        precipitacao_mm: true,
        municipio: "",
      }),
    ).toHaveProperty("ph_solo");
  });
  it("mantém rótulos da fixture coerentes com a regra de risco", () => {
    for (const row of fixtures()) expect(row.risco_quebra).toBe(riskRule(row));
    const [row] = fixtures();
    expect(
      riskRule({
        ...row,
        precipitacao_mm: 520,
        temperatura_media: 32.1,
        umidade_solo_pct: 28,
      }),
    ).toBe("Moderado");
  });
});
describe("Consistência de métricas e estado", () => {
  it("calcula MAE, RMSE e R² a partir das mesmas previsões", () => {
    const metrics = regressionMetrics([
      { talhao_id: "a", real: 10, previsto: 8 },
      { talhao_id: "b", real: 20, previsto: 22 },
    ]);
    expect(metrics.mae).toBe(2);
    expect(metrics.rmse).toBe(2);
    expect(metrics.r2).toBeCloseTo(0.84);
  });
  it("calcula matriz e acurácia coerentes", () => {
    const result = classificationMetrics([
      { talhao_id: "a", real: "Baixo", previsto: "Baixo" },
      { talhao_id: "b", real: "Alto", previsto: "Moderado" },
    ]);
    expect(result.accuracy).toBe(0.5);
    expect(result.confusion_matrix.flat().reduce((a, b) => a + b)).toBe(2);
    expect(result.confusion_matrix.reduce((s, row, i) => s + row[i], 0)).toBe(
      1,
    );
  });
  it("só produz os resultados das tarefas treinadas e preserva vínculo com a base", async () => {
    const data = await mockService.fetchData();
    const model = await mockService.train(defaultConfig(data.dataset_id));
    const result = await mockService.predict({
      dataset_id: data.dataset_id,
      model_ids: { regressao: model.model_id },
      input: data.records[0],
    });
    expect(result.produtividade_estimada_sc_ha).not.toBeNull();
    expect(result.risco_predito).toBeNull();
    expect(result.probabilidades).toBeNull();
    const other = await mockService.fetchData("demo-soja");
    await expect(
      mockService.predict({
        dataset_id: other.dataset_id,
        model_ids: { regressao: model.model_id },
        input: other.records[0],
      }),
    ).rejects.toThrow("incompatível");
  });
  it("impede treino em base vazia e KNN incompatível com o tamanho do treino", async () => {
    const empty = await mockService.fetchData("demo-empty");
    await expect(
      mockService.train(defaultConfig(empty.dataset_id)),
    ).rejects.toThrow("15 registros");
    const data = await mockService.fetchData();
    const config = defaultConfig(data.dataset_id, "regressao", "knn");
    config.hyperparameters.n_neighbors = 1000;
    await expect(mockService.train(config)).rejects.toThrow("n_neighbors");
  });
  it("retorna configuração aplicada imutável e matriz reconciliada", async () => {
    const data = await mockService.fetchData();
    const config = defaultConfig(data.dataset_id, "classificacao");
    const result = await mockService.train(config);
    config.hyperparameters.max_depth = 3;
    expect(result.config.hyperparameters.max_depth).toBe(10);
    expect(
      result.metrics.confusion_matrix!.flat().reduce((a, b) => a + b),
    ).toBe(result.test_size);
    expect(result.test_samples).toHaveLength(60);
    expect(result.train_size).toBe(240);
  });
});
