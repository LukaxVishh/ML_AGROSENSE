import { useMemo, useState } from "react";
import { CheckCircle2, FileSpreadsheet } from "lucide-react";
import type { Dataset, TalhaoRecord } from "../types";
import { columns as schemaColumns, format } from "../lib/domain";
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
