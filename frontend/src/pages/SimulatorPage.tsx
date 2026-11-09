import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, Sprout } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from "recharts";
import {
  CROPS,
  fieldLabels,
  format,
  numericRules,
  validateInput,
} from "../lib/domain";
import { agroService, isConnectionFailure } from "../services/agroService";
import type {
  Dataset,
  PredictionInput,
  PredictionResult,
  Task,
  TrainingResult,
} from "../types";
import { Notice, RiskBadge } from "../components/common";
import { TextField } from "../components/forms/TextField";
import { SelectField } from "../components/forms/SelectField";

const example = {
  municipio: "Sorriso",
  cultura: "Soja",
  area_hectares: "150",
  precipitacao_mm: "1420",
  temperatura_media: "25.3",
  umidade_solo_pct: "64.2",
  ph_solo: "6.1",
  teor_argila_pct: "48",
};

export default function SimulatorPage({
  data,
  models,
  onConnectionChange,
}: {
  data: Dataset;
  models: Partial<Record<Task, TrainingResult>>;
  onConnectionChange: (connected: boolean) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<PredictionResult>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const revision = useRef(0);

  useEffect(() => {
    revision.current++;
    setResult(undefined);
    setError("");
    setBusy(false);
  }, [data.dataset_id, models]);

  useEffect(
    () => () => {
      revision.current++;
    },
    [],
  );

  const trained = Object.keys(models).length > 0;
  const availableCrops = CROPS.filter((crop) =>
    data.records.some((record) => record.cultura === crop),
  );

  function change(key: string, value: string) {
    revision.current++;
    setValues((v) => ({ ...v, [key]: value }));
    setResult(undefined);
    setError("");
    setFields({});
    setBusy(false);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const input = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [
        k,
        k in numericRules
          ? v.trim() === ""
            ? null
            : Number(v.replace(",", "."))
          : v.trim(),
      ]),
    );
    const invalid = validateInput(input);
    if (
      input.cultura &&
      !availableCrops.includes(input.cultura as PredictionInput["cultura"])
    )
      invalid.cultura =
        "Selecione uma cultura presente na base de treinamento.";
    setFields(invalid);
    setResult(undefined);
    setError("");
    if (Object.keys(invalid).length) {
      document.getElementById(`input-${Object.keys(invalid)[0]}`)?.focus();
      return;
    }
    const current = ++revision.current;
    setBusy(true);
    try {
      const model_ids: Partial<Record<Task, string>> = {};
      if (models.regressao?.model_id) model_ids.regressao = models.regressao.model_id;
      if (models.classificacao?.model_id) model_ids.classificacao = models.classificacao.model_id;

      const response = await agroService.predict({
        dataset_id: data.dataset_id,
        model_ids,
        input: input as unknown as PredictionInput,
      });
      if (revision.current === current) {
        setResult(response);
        onConnectionChange(true);
      }
    } catch (reason) {
      if (revision.current === current) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Falha ao calcular o diagnóstico do cenário.",
        );
        if (isConnectionFailure(reason)) onConnectionChange(false);
      }
    } finally {
      if (revision.current === current) setBusy(false);
    }
  }

  // Comparativo do talhão simulado contra as médias da base
  const comparisonData = useMemo(() => {
    if (!result || result.produtividade_estimada_sc_ha === null) return null;
    const simProd = result.produtividade_estimada_sc_ha;
    const crop = values.cultura || "Soja";
    const city = values.municipio || "";

    const cropRecords = data.records.filter((r) => r.cultura === crop);
    const cropAvg = cropRecords.length
      ? cropRecords.reduce((s, r) => s + r.produtividade_sc_ha, 0) /
        cropRecords.length
      : null;

    const cityRecords = city
      ? data.records.filter(
          (r) => r.municipio.toLowerCase() === city.toLowerCase(),
        )
      : [];
    const cityAvg = cityRecords.length
      ? cityRecords.reduce((s, r) => s + r.produtividade_sc_ha, 0) /
        cityRecords.length
      : null;

    const baseAvg = data.summary.produtividade_media;

    const items = [
      {
        categoria: "Simulado",
        valor: Number(simProd.toFixed(1)),
        fill: "#2d6a4f",
      },
    ];
    if (cropAvg !== null) {
      items.push({
        categoria: `Média ${crop}`,
        valor: Number(cropAvg.toFixed(1)),
        fill: "#52b788",
      });
    }
    if (cityAvg !== null && cityRecords.length > 0) {
      items.push({
        categoria: `Média ${city}`,
        valor: Number(cityAvg.toFixed(1)),
        fill: "#74c69d",
      });
    }
    if (baseAvg !== null) {
      items.push({
        categoria: "Média Base",
        valor: Number(baseAvg.toFixed(1)),
        fill: "#95a682",
      });
    }

    const diffCrop =
      cropAvg !== null ? ((simProd - cropAvg) / cropAvg) * 100 : 0;

    return { items, diffCrop, crop, cropAvg };
  }, [
    result,
    values.cultura,
    values.municipio,
    data.records,
    data.summary.produtividade_media,
  ]);

  function field(key: string, label: string) {
    const errorMsg = fields[key];
    const props = {
      label,
      value: values[key] ?? "",
      onValueChange: (val: string) => change(key, val),
      error: errorMsg,
      id: `input-${key}`,
    };
    if (key === "cultura")
      return (
        <SelectField
          key={key}
          {...props}
          placeholder="Selecione"
          options={availableCrops.map((crop) => ({
            value: crop,
            label: crop,
          }))}
        />
      );
    const rule = numericRules[key as keyof typeof numericRules];
    return (
      <TextField
        key={key}
        {...props}
        inputMode={rule ? "decimal" : "text"}
        placeholder={
          rule
            ? `${format(rule[0], 1)} a ${format(rule[1], 1)}`
            : "Informe o município"
        }
      />
    );
  }

  return (
    <>
      {!trained && (
        <Notice warning>
          Treine pelo menos uma tarefa na barra lateral antes de executar a
          simulação. Para obter produtividade e risco, treine as duas tarefas.
        </Notice>
      )}
      <div className="simulator-layout">
        <form className="panel" onSubmit={submit} noValidate>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">CENÁRIO DO PRODUTOR</p>
              <h2>Condições do talhão</h2>
            </div>
            <button
              className="text-button"
              type="button"
              onClick={() => {
                revision.current++;
                setValues({ ...example, cultura: availableCrops[0] || "" });
                setResult(undefined);
                setFields({});
                setError("");
                setBusy(false);
              }}
            >
              Preencher exemplo
            </button>
          </div>
          <fieldset>
            <legend>
              <span>01</span> Local e solo
            </legend>
            <div className="form-grid">
              {field("municipio", "Município")}
              {field("cultura", "Cultura")}
              {[
                "area_hectares",
                "ph_solo",
                "teor_argila_pct",
                "umidade_solo_pct",
              ].map((k) =>
                field(k, fieldLabels[k as keyof typeof numericRules]),
              )}
            </div>
          </fieldset>
          <fieldset>
            <legend>
              <span>02</span> Cenário climático
            </legend>
            <p className="footnote">
              Informe as condições do ciclo completo. Não há consulta
              meteorológica em tempo real.
            </p>
            <div className="form-grid">
              {["precipitacao_mm", "temperatura_media"].map((k) =>
                field(k, fieldLabels[k as keyof typeof numericRules]),
              )}
            </div>
          </fieldset>
          {error && <Notice warning>{error}</Notice>}
          <button className="button full" disabled={!trained || busy}>
            {busy ? "Calculando cenário…" : "Calcular diagnóstico da safra"}
            <ArrowRight size={15} />
          </button>
        </form>

        <aside>
          <section className="result-card" aria-live="polite" aria-busy={busy}>
            <span className="result-icon">
              <Sprout size={30} />
            </span>
            <p className="eyebrow">
              {data.mode === "mock"
                ? "RESULTADO DEMONSTRATIVO"
                : "RESULTADO DO MODELO"}
            </p>
            {result ? (
              <>
                {result.produtividade_estimada_sc_ha !== null ? (
                  <>
                    <h2>
                      {format(result.produtividade_estimada_sc_ha, 2)}{" "}
                      <small>sc/ha</small>
                    </h2>
                    <p>Produtividade estimada</p>

                    {/* Gráfico comparativo de médias */}
                    {comparisonData && (
                      <div style={{ marginTop: "14px" }}>
                        <div
                          className={`comparison-pill ${
                            comparisonData.diffCrop < 0 ? "negative" : ""
                          }`}
                        >
                          {comparisonData.diffCrop >= 0 ? "+" : ""}
                          {format(comparisonData.diffCrop, 1)}% vs. média de{" "}
                          {comparisonData.crop}
                        </div>
                        <div className="chart-compact" style={{ marginTop: "10px" }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={comparisonData.items}
                              layout="vertical"
                              margin={{ top: 5, right: 25, left: 15, bottom: 5 }}
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                horizontal={false}
                                stroke="#eaf0e2"
                              />
                              <XAxis
                                type="number"
                                tickLine={false}
                                axisLine={false}
                                domain={[0, "auto"]}
                              />
                              <YAxis
                                type="category"
                                dataKey="categoria"
                                tickLine={false}
                                axisLine={false}
                                width={85}
                                tick={{ fontSize: 9, fill: "#607c4e" }}
                              />
                              <Tooltip
                                formatter={(v: unknown) => [
                                  `${format(Number(v), 1)} sc/ha`,
                                  "Produtividade",
                                ]}
                              />
                              <Bar
                                dataKey="valor"
                                radius={[0, 4, 4, 0]}
                                maxBarSize={16}
                              >
                                {comparisonData.items.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p>Produtividade indisponível: treine a regressão.</p>
                )}

                <div className="result-divider" />

                {result.risco_predito ? (
                  <>
                    <p>Classe de risco estimada</p>
                    <RiskBadge risk={result.risco_predito} />
                  </>
                ) : (
                  <p>Risco indisponível: treine a classificação.</p>
                )}

                {result.probabilidades && (
                  <div style={{ marginTop: "12px", textAlign: "left" }}>
                    <p
                      style={{
                        fontSize: "10px",
                        color: "#607c4e",
                        fontWeight: 600,
                        marginBottom: "4px",
                      }}
                    >
                      Distribuição de Probabilidades:
                    </p>
                    <div className="chart-compact" style={{ height: "90px" }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={Object.entries(result.probabilidades).map(
                            ([key, v]) => ({
                              classe: key,
                              prob: Number((v * 100).toFixed(1)),
                            }),
                          )}
                          layout="vertical"
                          margin={{ top: 2, right: 20, left: 10, bottom: 2 }}
                        >
                          <XAxis
                            type="number"
                            domain={[0, 100]}
                            unit="%"
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            type="category"
                            dataKey="classe"
                            tickLine={false}
                            axisLine={false}
                            width={60}
                          />
                          <Tooltip
                            formatter={(v: unknown) => [`${v}%`, "Probabilidade"]}
                          />
                          <Bar
                            dataKey="prob"
                            fill="#52b788"
                            radius={[0, 4, 4, 0]}
                            maxBarSize={12}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <div className="model-references">
                  {Object.entries(result.model_ids).map(([task, id]) => (
                    <small key={task}>
                      {task}: {id}
                    </small>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h2>
                  {busy
                    ? "Explorando seu cenário…"
                    : "O próximo cenário começa aqui."}
                </h2>
                <p>
                  Preencha o formulário. Os resultados das tarefas treinadas
                  aparecerão neste espaço.
                </p>
              </>
            )}
          </section>

          {result?.warnings.map((warning, i) => (
            <Notice key={i}>{warning}</Notice>
          ))}
          <Notice>
            O índice de risco usa uma regra didática. Os resultados não
            constituem orientação agronômica e não garantem rendimento de safra.
          </Notice>
        </aside>
      </div>
    </>
  );
}
