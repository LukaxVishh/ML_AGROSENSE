import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import { ALGORITHMS, format, TASKS } from "../lib/domain";
import type { Task, TrainingResult } from "../types";
import { Empty, Notice } from "../components/common";
import { PredictionAudit } from "../components/models/PredictionAudit";
export default function ModelPage({
  models,
  task,
  onTask,
}: {
  models: Partial<Record<Task, TrainingResult>>;
  task: Task;
  onTask: (task: Task) => void;
}) {
  const result = models[task];
  const metrics = result?.metrics;
  const residuals =
    result?.test_samples.map((s) => ({
      real: Number(s.real),
      previsto: Number(s.previsto),
      residuo: Number(s.real) - Number(s.previsto),
    })) || [];
  const buckets = Array.from({ length: 9 }, (_, i) => ({
    erro: i - 4,
    quantidade: residuals.filter(
      (s) => Math.max(-4, Math.min(4, Math.round(s.residuo))) === i - 4,
    ).length,
  }));
  return (
    <>
      <div className="filter-bar">
        <div>
          <span className="eyebrow">DIAGNÓSTICO DO MODELO</span>
          <p>Avaliação da tarefa efetivamente treinada.</p>
        </div>
        <label>
          Tarefa
          <select value={task} onChange={(e) => onTask(e.target.value as Task)}>
            {Object.entries(TASKS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!result || !metrics ? (
        <section className="panel">
          <Empty title="Este modelo ainda não foi treinado">
            Configure a tarefa na barra lateral e clique em “Treinar modelo”. No
            modo demonstração, esse processo simula o contrato de treinamento.
          </Empty>
        </section>
      ) : (
        <>
          {result.warnings.length > 0 && (
            <Notice>{result.warnings.join(" ")}</Notice>
          )}
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">
                  {result.mode === "mock"
                    ? "TREINAMENTO SIMULADO"
                    : "TREINAMENTO REAL"}
                </p>
                <h2>
                  {ALGORITHMS[result.config.algorithm]}{" "}
                  <span className="pill">{TASKS[result.config.task]}</span>
                </h2>
              </div>
              <span className="model-id">{result.model_id}</span>
            </div>
            <div className="diagnostic-metrics">
              {(task === "regressao"
                ? [
                    ["R²", metrics.r2, ""],
                    ["MAE", metrics.mae, "sc/ha"],
                    ["RMSE", metrics.rmse, "sc/ha"],
                  ]
                : [
                    [
                      "Acurácia",
                      metrics.accuracy == null ? null : metrics.accuracy * 100,
                      "%",
                    ],
                    ["F1 ponderado", metrics.f1_weighted, ""],
                    ["Precisão ponderada", metrics.precision, ""],
                    ["Recall ponderado", metrics.recall, ""],
                  ]
              ).map(([label, value, unit]) => (
                <div key={String(label)}>
                  <small>{label}</small>
                  <strong>
                    {format(
                      value as number | null,
                      task === "classificacao" && label !== "Acurácia" ? 3 : 2,
                    )}{" "}
                    <span>{unit}</span>
                  </strong>
                </div>
              ))}
            </div>
            <p className="footnote">
              {result.train_size} registros de treino · {result.test_size} de
              teste · base {result.dataset_id}. Os filtros do dashboard não
              alteram estas métricas.
            </p>
            <details>
              <summary>Configuração aplicada</summary>
              <pre>{JSON.stringify(result.config, null, 2)}</pre>
            </details>
          </section>
          {task === "regressao" ? (
            <div className="two-columns">
              <section className="panel">
                <h2>Real versus previsto</h2>
                <div className="chart">
                  <ResponsiveContainer>
                    <ScatterChart
                      margin={{ left: -10, right: 20, top: 20, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        type="number"
                        dataKey="real"
                        name="Real"
                        unit=" sc/ha"
                      />
                      <YAxis
                        type="number"
                        dataKey="previsto"
                        name="Previsto"
                        unit=" sc/ha"
                      />
                      <Tooltip formatter={(v) => format(Number(v), 2)} />
                      <Scatter data={residuals} fill="#4b8261" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </section>
              <section className="panel">
                <h2>Distribuição dos resíduos</h2>
                <p className="muted">
                  Real − previsto, em sc/ha. Extremos agrupados em ±4.
                </p>
                <div className="chart">
                  <ResponsiveContainer>
                    <BarChart data={buckets}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="erro" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar
                        dataKey="quantidade"
                        fill="#a4b78c"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </div>
          ) : (
            <section className="panel">
              <h2>Matriz de confusão</h2>
              <p className="muted">
                Linhas: classe real. Colunas: classe prevista. Valores absolutos
                do mesmo teste usado nas métricas.
              </p>
              <div className="table-scroll confusion">
                <table>
                  <thead>
                    <tr>
                      <th>Real / previsto</th>
                      {metrics.classes?.map((c) => (
                        <th key={c}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.confusion_matrix?.map((row, i) => (
                      <tr key={i}>
                        <th>{metrics.classes?.[i]}</th>
                        {row.map((count, j) => (
                          <td
                            key={j}
                            style={{
                              background: `rgba(66,126,90,${0.06 + (count / result.test_size) * 0.8})`,
                            }}
                          >
                            {count}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          <PredictionAudit samples={result.test_samples} task={task} />
        </>
      )}
    </>
  );
}
