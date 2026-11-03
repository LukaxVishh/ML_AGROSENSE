import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  ScatterChart,
  Scatter,
} from "recharts";
import GeoMap, { riskColors } from "../components/GeoMap";
import { CROPS, format, pearson, RISKS } from "../lib/domain";
import type { Dataset, TalhaoRecord } from "../types";
import { Empty } from "../components/common";
const fields = [
  "precipitacao_mm",
  "temperatura_media",
  "umidade_solo_pct",
  "ph_solo",
  "teor_argila_pct",
  "produtividade_sc_ha",
] as const;
const names = ["Chuva", "Temp.", "Umidade", "pH", "Argila", "Produtiv."];
export default function VisualizationPage({ data }: { data: Dataset }) {
  const [crop, setCrop] = useState("Todas");
  const [city, setCity] = useState("Todos");
  const cities = [...new Set(data.records.map((r) => r.municipio))].sort();
  const rows = useMemo(
    () =>
      data.records.filter(
        (r) =>
          (crop === "Todas" || r.cultura === crop) &&
          (city === "Todos" || r.municipio === city),
      ),
    [data, crop, city],
  );
  const bars = CROPS.map((c) => {
    const group = rows.filter((r) => r.cultura === c);
    return {
      cultura: c,
      media: group.length
        ? group.reduce((s, r) => s + r.produtividade_sc_ha, 0) / group.length
        : null,
    };
  });
  const risks = RISKS.map((r) => ({
    name: r,
    value: rows.filter((t) => t.risco_quebra === r).length,
  }));
  const correlations = fields.map((a) =>
    fields.map((b) => pearson(rows, a, b)),
  );
  return (
    <>
      <div className="filter-bar">
        <div>
          <span className="eyebrow">EXPLORAR A BASE</span>
          <p>Os filtros atualizam o mapa e todos os gráficos.</p>
        </div>
        <label>
          Cultura
          <select value={crop} onChange={(e) => setCrop(e.target.value)}>
            <option>Todas</option>
            {CROPS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Município
          <select value={city} onChange={(e) => setCity(e.target.value)}>
            <option>Todos</option>
            {cities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      {rows.length ? (
        <>
          <section className="panel map-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">VISÃO GEOGRÁFICA</p>
                <h2>Onde os dados encontram o campo</h2>
              </div>
              <span className="pill">{rows.length} talhões visíveis</span>
            </div>
            <GeoMap records={rows} />
            <details>
              <summary>Consultar coordenadas e valores ({rows.length})</summary>
              <div className="table-scroll coordinate-table">
                <table>
                  <thead>
                    <tr>
                      <th>Talhão</th>
                      <th>Município</th>
                      <th>Latitude</th>
                      <th>Longitude</th>
                      <th>Chuva · mm</th>
                      <th>Produtividade · sc/ha</th>
                      <th>Risco</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.talhao_id}>
                        <td>{r.talhao_id}</td>
                        <td>{r.municipio}</td>
                        <td>{r.latitude}</td>
                        <td>{r.longitude}</td>
                        <td>{format(r.precipitacao_mm, 1)}</td>
                        <td>{format(r.produtividade_sc_ha, 1)}</td>
                        <td>{r.risco_quebra}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>
          <div className="two-columns">
            <section className="panel">
              <h2>Produtividade por cultura</h2>
              <p className="muted">Média histórica · sacas por hectare</p>
              <div className="chart">
                <ResponsiveContainer>
                  <BarChart
                    data={bars}
                    margin={{ left: -20, right: 15, top: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="cultura"
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(v) => `${format(Number(v), 2)} sc/ha`}
                    />
                    <Bar
                      dataKey="media"
                      name="Produtividade"
                      fill="#447b5a"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={50}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="footnote">
                {bars
                  .map((b) => `${b.cultura}: ${format(b.media, 1)} sc/ha`)
                  .join(" · ")}
              </p>
            </section>
            <section className="panel">
              <h2>Distribuição de risco</h2>
              <p className="muted">Classes históricas da base filtrada</p>
              <div className="chart">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={risks}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={57}
                      outerRadius={85}
                      paddingAngle={4}
                    >
                      {risks.map((r) => (
                        <Cell key={r.name} fill={riskColors[r.name]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <p className="footnote">
                {risks
                  .map(
                    (r) =>
                      `${r.name}: ${r.value} (${format((r.value / rows.length) * 100, 1)}%)`,
                  )
                  .join(" · ")}
              </p>
            </section>
            <section className="panel">
              <h2>Chuva e produtividade</h2>
              <p className="muted">Cada ponto representa um talhão.</p>
              <div className="chart">
                <ResponsiveContainer>
                  <ScatterChart
                    margin={{ left: -15, right: 20, top: 20, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      dataKey="precipitacao_mm"
                      name="Chuva"
                      unit=" mm"
                      tickFormatter={(v) => format(Number(v))}
                    />
                    <YAxis
                      type="number"
                      dataKey="produtividade_sc_ha"
                      name="Produtividade"
                      unit=" sc/ha"
                      tickFormatter={(v) => format(Number(v))}
                    />
                    <Tooltip formatter={(v) => format(Number(v), 2)} />
                    <Scatter data={rows} fill="#6b9374" fillOpacity={0.65} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <p className="footnote">
                Correlação não demonstra causalidade. Valores individuais
                disponíveis na tabela do mapa.
              </p>
            </section>
            <section className="panel">
              <h2>Correlação entre variáveis</h2>
              <p className="muted">Pearson · de −1 a +1 · base filtrada</p>
              <div className="table-scroll correlation">
                <table>
                  <thead>
                    <tr>
                      <th></th>
                      {names.map((n) => (
                        <th key={n}>{n}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {correlations.map((row, i) => (
                      <tr key={fields[i]}>
                        <th>{names[i]}</th>
                        {row.map((value, j) => (
                          <td
                            key={j}
                            style={{
                              background:
                                value === null
                                  ? "#f5f6f2"
                                  : `rgba(${value < 0 ? "193,117,83" : "66,126,90"},${Math.abs(value) * 0.55 + 0.04})`,
                            }}
                          >
                            {format(value, 2)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="footnote">
                “—” indica variância nula ou menos de dois registros.
              </p>
            </section>
          </div>
        </>
      ) : (
        <section className="panel">
          <Empty title="Nenhum dado para estes filtros">
            Escolha outra cultura ou município.
          </Empty>
        </section>
      )}
    </>
  );
}
