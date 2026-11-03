import type { AgroService } from "../types";
import { mockService } from "./mockService";
import {
  ContractError,
  parseDataset,
  parseHealth,
  parsePrediction,
  parseTraining,
} from "./contracts";
export const useMock = import.meta.env.VITE_USE_MOCK !== "false";
const base = (
  import.meta.env.VITE_API_URL || "http://localhost:8000/api"
).replace(/\/$/, "");
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export function isConnectionFailure(error: unknown) {
  return (
    error instanceof ContractError ||
    (error instanceof ApiError && (error.status === 0 || error.status >= 500))
  );
}
async function request(path: string, init?: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      ...init,
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw new ApiError(
      "Não foi possível conectar à API. Verifique o back-end e tente novamente.",
      0,
    );
  }
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(
      body?.erro?.mensagem || `A API retornou HTTP ${response.status}.`,
      response.status,
    );
  if (!body) throw new ContractError("o corpo deve conter JSON válido.");
  return body;
}
const post = (path: string, body: unknown) =>
  request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
export const httpService: AgroService = {
  health: async () => parseHealth(await request("/health")),
  fetchData: async (id) =>
    parseDataset(
      await request(
        `/data${id ? `?dataset_id=${encodeURIComponent(id)}` : ""}`,
      ),
      id,
    ),
  uploadDataset: async (file) => {
    const body = new FormData();
    body.append("file", file);
    return parseDataset(await request("/upload", { method: "POST", body }));
  },
  train: async (config) =>
    parseTraining(await post("/model/train", config), config),
  predict: async (payload) =>
    parsePrediction(await post("/predict", payload), payload),
};
export const agroService = useMock ? mockService : httpService;
