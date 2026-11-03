import { useEffect, useRef, useState } from "react";
import { defaultConfig } from "../lib/domain";
import {
  agroService,
  ApiError,
  isConnectionFailure,
} from "../services/agroService";
import type {
  AgroService,
  Dataset,
  Task,
  TrainConfig,
  TrainingResult,
} from "../types";

/** Estado e operações da base/modelos; não contém navegação ou marcação visual. */
export function useAgroWorkspace(service: AgroService = agroService) {
  const [data, setData] = useState<Dataset>();
  const [busy, setBusy] = useState("carregamento");
  const [error, setError] = useState("");
  const [config, setConfig] = useState<TrainConfig>(defaultConfig(""));
  const [models, setModels] = useState<Partial<Record<Task, TrainingResult>>>(
    {},
  );
  const [viewTask, setViewTask] = useState<Task>("regressao");
  const [preset, setPreset] = useState("demo");
  const [connected, setConnected] = useState(false);
  const revision = useRef(0);
  const pending = useRef(false);

  function applyDataset(value: Dataset, source: string) {
    setData(value);
    setPreset(source);
    setModels({});
    setConfig(defaultConfig(value.dataset_id));
    setViewTask("regressao");
    setConnected(true);
  }
  function fail(reason: unknown) {
    setError(
      reason instanceof Error
        ? reason.message
        : "Não foi possível concluir a operação.",
    );
    if (isConnectionFailure(reason)) setConnected(false);
    else if (reason instanceof ApiError) setConnected(true);
  }
  useEffect(() => {
    const current = ++revision.current;
    pending.current = true;
    setBusy("carregamento");
    setError("");
    service
      .health()
      .then(() => service.fetchData())
      .then((value) => {
        if (revision.current === current) applyDataset(value, "demo");
      })
      .catch((reason) => {
        if (revision.current === current) {
          fail(reason);
          setConnected(false);
        }
      })
      .finally(() => {
        if (revision.current === current) {
          pending.current = false;
          setBusy("");
        }
      });
    return () => {
      revision.current++;
      pending.current = false;
    };
  }, [service]);

  async function load(id?: string, file?: File) {
    if (pending.current) return;
    const current = ++revision.current;
    pending.current = true;
    setBusy(file ? "upload" : "base");
    setError("");
    try {
      await service.health();
      const value = file
        ? await service.uploadDataset(file)
        : await service.fetchData(id);
      if (revision.current === current)
        applyDataset(value, file ? "upload" : id || "demo");
    } catch (reason) {
      if (revision.current === current) fail(reason);
    } finally {
      if (revision.current === current) {
        pending.current = false;
        setBusy("");
      }
    }
  }
  async function train(): Promise<Task | undefined> {
    if (!data || pending.current) return;
    const current = ++revision.current;
    pending.current = true;
    setBusy("treino");
    setError("");
    try {
      const result = await service.train(config);
      if (revision.current !== current) return;
      setModels((previous) => ({ ...previous, [result.config.task]: result }));
      setViewTask(result.config.task);
      setConnected(true);
      return result.config.task;
    } catch (reason) {
      if (revision.current === current) fail(reason);
    } finally {
      if (revision.current === current) {
        pending.current = false;
        setBusy("");
      }
    }
  }
  return {
    data,
    busy,
    error,
    config,
    setConfig,
    models,
    viewTask,
    setViewTask,
    preset,
    connected,
    setConnected,
    load,
    train,
  };
}
