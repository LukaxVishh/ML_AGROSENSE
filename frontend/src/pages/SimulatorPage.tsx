import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, Sprout } from "lucide-react";
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
      const response = await agroService.predict({
        dataset_id: data.dataset_id,
        model_ids: Object.fromEntries(
          Object.entries(models).map(([task, model]) => [task, model.model_id]),
        ),
        input: input as unknown as PredictionInput,
      });
      if (revision.current === current) {
        setResult(response);
        onConnectionChange(true);
      }
    } catch (err) {
      if (revision.current === current) {
        setError((err as Error).message);
        if (isConnectionFailure(err)) onConnectionChange(false);
      }
    } finally {
      if (revision.current === current) setBusy(false);
    }
  }
  function field(key: string, label: string) {
    const props = {
      id: `input-${key}`,
      label,
      value: values[key] || "",
      onValueChange: (value: string) => change(key, value),
      error: fields[key],
    };
    if (key === "cultura")
      return (
        <SelectField
          key={key}
          {...props}
          placeholder="Selecione"
          options={availableCrops.map((crop) => ({ value: crop, label: crop }))}
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
                  <div>
                    {Object.entries(result.probabilidades).map(([key, v]) => (
                      <p key={key}>
                        {key}: {format(v * 100, 1)}%
                      </p>
                    ))}
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
