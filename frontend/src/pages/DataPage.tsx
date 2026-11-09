import { useMemo, useState } from "react";
import { BarChart3, CheckCircle2, FileSpreadsheet, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import type { Dataset, TalhaoRecord } from "../types";
import { columns as schemaColumns, CROPS, format } from "../lib/domain";
import { Empty, Panel, RiskBadge } from "../components/common";
import { DatasetUpload } from "../components/datasets/DatasetUpload";
import { SearchField } from "../components/forms/SearchField";
import { DataTable, type TableColumn } from "../components/tables/DataTable";
import { Pagination } from "../components/tables/Pagination";

const tableColumns: TableColumn<TalhaoRecord>[] = [
  {
    id: "talhao",
    label: "Talhão",
    sortKey: "talhao_id",
    render: (record) => <strong>{record.talhao_id}</strong>,
  },
  {
    id: "municipio",
    label: "Município",
    sortKey: "municipio",
    render: (record) => record.municipio,
  },
  {
    id: "cultura",
    label: "Cultura",
    sortKey: "cultura",
    render: (record) => <span className="crop-badge">{record.cultura}</span>,
  },
  {
    id: "area",
    label: "Área · ha",
    sortKey: "area_hectares",
    render: (record) => format(record.area_hectares, 1),
  },
  {
    id: "produtividade",
    label: "Produtividade · sc/ha",
    sortKey: "produtividade_sc_ha",
    render: (record) => format(record.produtividade_sc_ha, 1),
  },
  {
    id: "risco",
    label: "Risco",
    sortKey: "risco_quebra",
    render: (record) => <RiskBadge risk={record.risco_quebra} />,
  },
];

const PAGE_SIZE = 10;

export default function DataPage({
  data,
  onUpload,
  busy,
}: {
  data: Dataset;
  onUpload: (file: File) => void;
  busy: boolean;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<{ key: keyof TalhaoRecord; asc: boolean }>({
    key: "talhao_id",
    asc: true,
  });

  // Agregações em médias por município
  const cityAverages = useMemo(() => {
    if (!data.records.length) return [];
    const grouped: Record<
      string,
      { count: number; sumProd: number; sumChuva: number; sumArea: number }
    > = {};
    for (const r of data.records) {
      if (!grouped[r.municipio]) {
        grouped[r.municipio] = { count: 0, sumProd: 0, sumChuva: 0, sumArea: 0 };
      }
      grouped[r.municipio].count++;
      grouped[r.municipio].sumProd += r.produtividade_sc_ha;
      grouped[r.municipio].sumChuva += r.precipitacao_mm;
      grouped[r.municipio].sumArea += r.area_hectares;
    }
    return Object.entries(grouped)
      .map(([municipio, stats]) => ({
        municipio,
        mediaProdutividade: Number((stats.sumProd / stats.count).toFixed(1)),
        mediaArea: Number((stats.sumArea / stats.count).toFixed(1)),
        mediaChuva: Number((stats.sumChuva / stats.count).toFixed(0)),
        talhoes: stats.count,
      }))
      .sort((a, b) => b.mediaProdutividade - a.mediaProdutividade);
  }, [data.records]);

  // Agregações em médias por cultura
  const cropAverages = useMemo(() => {
    if (!data.records.length) return [];
    return CROPS.map((c) => {
      const subset = data.records.filter((r) => r.cultura === c);
      if (!subset.length) return null;
      const sumProd = subset.reduce((acc, r) => acc + r.produtividade_sc_ha, 0);
      const sumArea = subset.reduce((acc, r) => acc + r.area_hectares, 0);
      return {
        cultura: c,
        mediaProdutividade: Number((sumProd / subset.length).toFixed(1)),
        mediaArea: Number((sumArea / subset.length).toFixed(1)),
        talhoes: subset.length,
      };
    }).filter(Boolean) as {
      cultura: string;
      mediaProdutividade: number;
      mediaArea: number;
      talhoes: number;
    }[];
  }, [data.records]);

  const rows = useMemo(
    () =>
      data.records
        .filter((record) =>
          `${record.talhao_id} ${record.municipio} ${record.cultura}`
            .toLocaleLowerCase("pt-BR")
            .includes(search.toLocaleLowerCase("pt-BR")),
        )
        .sort((a, b) => {
          const x = a[sort.key],
            y = b[sort.key];
          return (
            (typeof x === "number" && typeof y === "number"
              ? x - y
              : String(x).localeCompare(String(y), "pt-BR", {
                  numeric: true,
                })) * (sort.asc ? 1 : -1)
          );
        }),
    [data, search, sort],
  );

  const current = Math.min(
    page,
    Math.max(0, Math.ceil(rows.length / PAGE_SIZE) - 1),
  );

  return (
    <>
      <DatasetUpload onUpload={onUpload} busy={busy} />

      {/* Painel de Visualizações em Médias dos Talhões */}
      {data.records.length > 0 && (
        <Panel
          eyebrow="PANORAMA AGREGADO EM MÉDIAS"
          title="Médias por Região e Cultura"
          description="Visão resumida das médias da base para identificar rapidamente o comportamento regional sem depender da tabela extensa."
          className="averages-panel"
        >
          <div className="averages-grid">
            <div className="chart-card-inner">
              <h3 className="chart-subheading">
                <BarChart3 size={15} /> Produtividade Média por Município (sc/ha)
              </h3>
              <div className="chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={cityAverages}
                    margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eaf0e2" />
                    <XAxis
                      dataKey="municipio"
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                      height={40}
                    />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(v: unknown) => [
                        `${format(Number(v), 1)} sc/ha`,
                        "Produtividade Média",
                      ]}
                    />
                    <Bar
                      dataKey="mediaProdutividade"
                      fill="#447b5a"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={45}
                    >
                      {cityAverages.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={index === 0 ? "#2d6a4f" : "#52b788"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="footnote">
                Líder regional: <strong>{cityAverages[0]?.municipio}</strong> com média de{" "}
                {format(cityAverages[0]?.mediaProdutividade, 1)} sc/ha ({cityAverages[0]?.talhoes}{" "}
                talhões).
              </p>
            </div>

            <div className="chart-card-inner">
              <h3 className="chart-subheading">
                <TrendingUp size={15} /> Produtividade e Área Médias por Cultura
              </h3>
              <div className="chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={cropAverages}
                    margin={{ top: 10, right: 10, left: -20, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eaf0e2" />
                    <XAxis dataKey="cultura" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(v: unknown, name: unknown) => [
                        name === "Produtividade (sc/ha)"
                          ? `${format(Number(v), 1)} sc/ha`
                          : `${format(Number(v), 1)} ha`,
                        String(name),
                      ]}
                    />
                    <Bar
                      dataKey="mediaProdutividade"
                      name="Produtividade (sc/ha)"
                      fill="#447b5a"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={38}
                    />
                    <Bar
                      dataKey="mediaArea"
                      name="Área Média (ha)"
                      fill="#88a669"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={38}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="footnote">
                {cropAverages
                  .map(
                    (c) =>
                      `${c.cultura}: ${format(c.mediaProdutividade, 1)} sc/ha (área média: ${format(c.mediaArea, 0)} ha)`,
                  )
                  .join(" · ")}
              </p>
            </div>
          </div>
        </Panel>
      )}

      {/* Painel da Tabela Detalhada com Busca e Paginação */}
      <Panel
        eyebrow="SUA BASE EM DETALHES"
        title={
          <>
            Talhões monitorados{" "}
            <span className="count-badge">{format(data.records.length)}</span>
          </>
        }
        actions={
          <span className="schema-badge">
            <CheckCircle2 size={13} />
            {data.validation.columns_detected}/{schemaColumns.length} colunas
          </span>
        }
      >
        <div className="table-toolbar">
          <span className="filename">
            <FileSpreadsheet size={15} />
            {data.filename}
          </span>
          <SearchField
            label="Buscar talhão, município ou cultura"
            value={search}
            onValueChange={(value) => {
              setSearch(value);
              setPage(0);
            }}
          />
        </div>
        {rows.length ? (
          <>
            <DataTable
              rows={rows.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE)}
              columns={tableColumns}
              rowKey={(record) => record.talhao_id}
              caption="Talhões da base ativa"
              sort={sort}
              onSort={(key) =>
                setSort({ key, asc: sort.key === key ? !sort.asc : true })
              }
            />
            <Pagination
              page={current}
              pageSize={PAGE_SIZE}
              total={rows.length}
              onPageChange={setPage}
            />
          </>
        ) : (
          <Empty
            title={
              data.records.length
                ? "Nenhum talhão encontrado"
                : "Esta base está vazia"
            }
          >
            Ajuste a busca ou importe uma base para começar.
          </Empty>
        )}
      </Panel>

      <section className="schema-strip">
        <CheckCircle2 size={17} />
        <p>
          <strong>Estrutura pronta para integração.</strong> As 13 colunas
          incluem localização, clima, solo e os dois alvos históricos. A
          validação rejeita valores ausentes, limites inválidos e IDs
          duplicados.
        </p>
      </section>
    </>
  );
}
