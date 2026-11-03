import { FlaskConical, Play, SlidersHorizontal } from "lucide-react";
import {
  ALGORITHMS,
  defaultConfig,
  sameTrainConfig,
  TASKS,
} from "../../lib/domain";
import type { Algorithm, Task, TrainConfig, TrainingResult } from "../../types";
import { RangeField } from "../forms/RangeField";
import { SelectField } from "../forms/SelectField";
export default function ModelControls({
  config,
  onChange,
  onTrain,
  busy,
  model,
}: {
  config: TrainConfig;
  onChange: (config: TrainConfig) => void;
  onTrain: () => void;
  busy: boolean;
  model?: TrainingResult;
}) {
  const h = config.hyperparameters;
  const set = (key: string, value: string | number) =>
    onChange({ ...config, hyperparameters: { ...h, [key]: value } });
  return (
    <div className="model-controls">
      <p className="sidebar-label">
        <SlidersHorizontal size={13} /> CONFIGURAR MODELO
      </p>
      <fieldset disabled={busy}>
        <SelectField
          className="control-label"
          label="Objetivo"
          value={config.task}
          options={Object.entries(TASKS).map(([value, label]) => ({
            value,
            label,
          }))}
          onValueChange={(task) =>
            onChange(
              defaultConfig(config.dataset_id, task as Task, config.algorithm),
            )
          }
        />
        <SelectField
          className="control-label"
          label="Algoritmo"
          value={config.algorithm}
          options={Object.entries(ALGORITHMS).map(([value, label]) => ({
            value,
            label,
          }))}
          onValueChange={(algorithm) =>
            onChange(
              defaultConfig(
                config.dataset_id,
                config.task,
                algorithm as Algorithm,
              ),
            )
          }
        />
        <div className="slider-group">
          {config.algorithm === "random_forest" ? (
            <>
              <RangeField
                label="Número de árvores"
                min={10}
                max={300}
                step={10}
                value={Number(h.n_estimators)}
                onValueChange={(v) => set("n_estimators", v)}
              />
              <RangeField
                label="Profundidade máxima"
                min={2}
                max={25}
                value={Number(h.max_depth)}
                onValueChange={(v) => set("max_depth", v)}
              />
              <RangeField
                label="Amostras por divisão"
                min={2}
                max={10}
                value={Number(h.min_samples_split)}
                onValueChange={(v) => set("min_samples_split", v)}
              />
            </>
          ) : config.algorithm === "decision_tree" ? (
            <>
              <RangeField
                label="Profundidade máxima"
                min={1}
                max={20}
                value={Number(h.max_depth)}
                onValueChange={(v) => set("max_depth", v)}
              />
              <SelectField
                className="control-label"
                label="Critério"
                value={String(h.criterion)}
                options={(config.task === "regressao"
                  ? ["squared_error", "absolute_error"]
                  : ["gini", "entropy"]
                ).map((v) => ({ value: v, label: v }))}
                onValueChange={(v) => set("criterion", v)}
              />
            </>
          ) : (
            <>
              <RangeField
                label="Número de vizinhos"
                min={1}
                max={25}
                value={Number(h.n_neighbors)}
                onValueChange={(v) => set("n_neighbors", v)}
              />
              <SelectField
                className="control-label"
                label="Pesos"
                value={String(h.weights)}
                options={[
                  { value: "uniform", label: "Uniformes" },
                  { value: "distance", label: "Por distância" },
                ]}
                onValueChange={(v) => set("weights", v)}
              />
              <SelectField
                className="control-label"
                label="Distância"
                value={String(h.metric)}
                options={[
                  { value: "euclidean", label: "Euclidiana" },
                  { value: "manhattan", label: "Manhattan" },
                ]}
                onValueChange={(v) => set("metric", v)}
              />
            </>
          )}
        </div>
        <button className="button train-button" onClick={onTrain} type="button">
          <Play size={14} />
          {busy ? "Processando…" : "Treinar modelo"}
        </button>
      </fieldset>
      <p className="sidebar-help">
        <FlaskConical size={13} />
        {model
          ? sameTrainConfig(model.config, config)
            ? "Configuração atual aplicada."
            : "Configuração alterada. Treine para aplicar."
          : "Selecione os parâmetros e simule um treinamento."}
      </p>
    </div>
  );
}
