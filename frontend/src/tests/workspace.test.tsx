// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAgroWorkspace } from "../hooks/useAgroWorkspace";
import { fixtures } from "../mocks/fixtures";
import { summary } from "../lib/domain";
import { ApiError } from "../services/agroService";
import type { AgroService, Dataset, TrainingResult } from "../types";
import DataPage from "../pages/DataPage";
import SimulatorPage from "../pages/SimulatorPage";
const records = fixtures(30);
const data: Dataset = {
  dataset_id: "ds-teste",
  filename: "teste.csv",
  records,
  summary: summary(records),
  validation: { columns_detected: 13, warnings: [] },
  mode: "mock",
};
function service(): AgroService {
  return {
    health: vi
      .fn()
      .mockResolvedValue({ status: "ok", contract_version: "1.0" }),
    fetchData: vi.fn().mockResolvedValue(data),
    uploadDataset: vi.fn(),
    train: vi
      .fn()
      .mockImplementation(
        async (config) =>
          ({
            model_id: "teste-modelo",
            dataset_id: data.dataset_id,
            config,
            mode: "mock",
            train_size: 24,
            test_size: 6,
            metrics: { r2: 0.5, mae: 1, rmse: 2 },
            test_samples: [],
            warnings: [],
          }) satisfies TrainingResult,
      ),
    predict: vi.fn(),
  };
}
afterEach(cleanup);
describe("Estado compartilhado e componentes reutilizáveis", () => {
  it("oferece no formulário apenas culturas presentes na base ativa", () => {
    const soja = records.filter(record => record.cultura === "Soja");
    render(<SimulatorPage data={{...data,records:soja,summary:summary(soja)}} models={{}} onConnectionChange={vi.fn()}/>);
    const select = screen.getByRole("combobox",{name:"Cultura"});
    expect(within(select).getAllByRole("option").map(option => option.textContent)).toEqual(["Selecione","Soja"]);
    fireEvent.click(screen.getByRole("button",{name:"Preencher exemplo"}));
    expect((select as HTMLSelectElement).value).toBe("Soja");
  });
  it("preserva a base/modelo em falhas e invalida modelos ao trocar a base", async () => {
    const api = service();
    const { result } = renderHook(() => useAgroWorkspace(api));
    await waitFor(() => expect(result.current.busy).toBe(""));
    await act(async () => {
      await result.current.train();
    });
    expect(result.current.models.regressao?.model_id).toBe("teste-modelo");
    vi.mocked(api.fetchData).mockRejectedValueOnce(
      new Error("Arquivo inválido"),
    );
    await act(async () => {
      await result.current.load("outra");
    });
    expect(result.current.data?.dataset_id).toBe(data.dataset_id);
    expect(result.current.models.regressao).toBeDefined();
    vi.mocked(api.fetchData).mockResolvedValueOnce({
      ...data,
      dataset_id: "ds-nova",
    });
    await act(async () => {
      await result.current.load("nova");
    });
    expect(result.current.data?.dataset_id).toBe("ds-nova");
    expect(result.current.models).toEqual({});
  });
  it("marca desconexão em 503 e recupera conexão sem perder dados em 422", async () => {
    const api = service();
    const { result } = renderHook(() => useAgroWorkspace(api));
    await waitFor(() => expect(result.current.connected).toBe(true));
    vi.mocked(api.train).mockRejectedValueOnce(
      new ApiError("Indisponível", 503),
    );
    await act(async () => {
      await result.current.train();
    });
    expect(result.current.connected).toBe(false);
    vi.mocked(api.train).mockRejectedValueOnce(
      new ApiError("Parâmetro inválido", 422),
    );
    await act(async () => {
      await result.current.train();
    });
    expect(result.current.connected).toBe(true);
    expect(result.current.data).toBeDefined();
  });
  it("mantém busca, ordenação e paginação após extrair a tabela", () => {
    render(<DataPage data={data} onUpload={vi.fn()} busy={false} />);
    expect(screen.getByText("TAL-0001")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Próxima página" }));
    expect(screen.getByText("TAL-0011")).toBeDefined();
    fireEvent.change(
      screen.getByRole("textbox", {
        name: "Buscar talhão, município ou cultura",
      }),
      { target: { value: "Sorriso" } },
    );
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(6);
    fireEvent.click(
      screen.getByRole("button", { name: "Talhão" }),
    );
    expect(within(table).getAllByRole("row")[1].textContent).toContain(
      "TAL-0025",
    );
  });
});
