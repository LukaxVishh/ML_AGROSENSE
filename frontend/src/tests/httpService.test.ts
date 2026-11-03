import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { defaultConfig } from "../lib/domain";
import { httpService, isConnectionFailure } from "../services/agroService";
import { mockService } from "../services/mockService";
import type {
  Dataset,
  PredictionRequest,
  PredictionResult,
  TrainingResult,
} from "../types";

let dataset: Dataset;
let trained: TrainingResult;
let payload: PredictionRequest;
let prediction: PredictionResult;
const response = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
beforeAll(async () => {
  dataset = { ...(await mockService.fetchData()), mode: "real" };
  trained = {
    ...(await mockService.train(defaultConfig(dataset.dataset_id))),
    mode: "real",
  };
  payload = {
    dataset_id: dataset.dataset_id,
    model_ids: { regressao: trained.model_id },
    input: dataset.records[0],
  };
  prediction = { ...(await mockService.predict(payload)), mode: "real" };
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Fronteira HTTP", () => {
  it("aceita dados válidos e envia o identificador na URL", async () => {
    const fetch = vi.fn().mockResolvedValue(response(dataset));
    vi.stubGlobal("fetch", fetch);
    expect(
      (await httpService.fetchData(dataset.dataset_id)).records,
    ).toHaveLength(300);
    expect(fetch.mock.calls[0][0]).toContain(
      `dataset_id=${dataset.dataset_id}`,
    );
  });
  it("rejeita resposta 200 fora do contrato sem recorrer ao mock", async () => {
    const fallback = vi.spyOn(mockService, "fetchData");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({})));
    await expect(httpService.fetchData()).rejects.toThrow("contrato");
    expect(fallback).not.toHaveBeenCalled();
  });
  it("rejeita resumos divergentes e respostas de outra base", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          response({
            ...dataset,
            summary: { ...dataset.summary, total_talhoes: 1 },
          }),
        ),
    );
    await expect(httpService.fetchData()).rejects.toThrow("total de registros");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(dataset)));
    await expect(httpService.fetchData("ds-outra")).rejects.toThrow(
      "dataset_id",
    );
  });
  it("distingue erro de validação de falha de serviço", async () => {
    for (const [status, unavailable] of [
      [422, false],
      [503, true],
    ] as const) {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            response({ erro: { mensagem: "Falha de exemplo." } }, status),
          ),
      );
      const error = await httpService.fetchData().catch((error) => error);
      expect(error.message).toBe("Falha de exemplo.");
      expect(isConnectionFailure(error)).toBe(unavailable);
    }
  });
  it("reporta falha de rede e versão de contrato incompatível", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const error = await httpService.health().catch((error) => error);
    expect(isConnectionFailure(error)).toBe(true);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(response({ status: "ok", contract_version: "2.0" })),
    );
    await expect(httpService.health()).rejects.toThrow("contrato");
  });
  it("valida o treino aplicado e suas métricas", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(trained)));
    expect((await httpService.train(trained.config)).model_id).toBe(
      trained.model_id,
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response({ ...trained, metrics: {} })),
    );
    await expect(httpService.train(trained.config)).rejects.toThrow("métricas");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(response({ ...trained, dataset_id: "ds-outra" })),
    );
    await expect(httpService.train(trained.config)).rejects.toThrow(
      "configuração",
    );
  });
  it("rejeita previsão de outro modelo e probabilidade inconsistente", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(prediction)));
    expect((await httpService.predict(payload)).risco_predito).toBeNull();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          response({ ...prediction, model_ids: { regressao: "outro" } }),
        ),
    );
    await expect(httpService.predict(payload)).rejects.toThrow("outro modelo");
    const combined = {
      ...payload,
      model_ids: { ...payload.model_ids, classificacao: "clf" },
    };
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          response({
            ...prediction,
            model_ids: combined.model_ids,
            risco_predito: "Baixo",
            probabilidades: { Baixo: 0.8, Moderado: 0.5, Alto: 0.1 },
          }),
        ),
    );
    await expect(httpService.predict(combined)).rejects.toThrow("somam 1");
  });
  it("confere a matriz e a acurácia contra a auditoria de classificação", async () => {
    const classifier = {
      ...(await mockService.train(
        defaultConfig(dataset.dataset_id, "classificacao"),
      )),
      mode: "real",
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(classifier)));
    expect(
      (await httpService.train(classifier.config)).test_samples,
    ).toHaveLength(60);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          response({
            ...classifier,
            metrics: { ...classifier.metrics, accuracy: 0 },
          }),
        ),
    );
    await expect(httpService.train(classifier.config)).rejects.toThrow(
      "acurácia",
    );
  });
});
