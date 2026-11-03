import { format } from "../../lib/domain";
import type { Sample, Task } from "../../types";
import { Panel } from "../common";
import { DataTable, type TableColumn } from "../tables/DataTable";
export function PredictionAudit({
  samples,
  task,
}: {
  samples: Sample[];
  task: Task;
}) {
  const display = (value: Sample["real"]) =>
    typeof value === "number" ? `${format(value, 2)} sc/ha` : value;
  const columns: TableColumn<Sample>[] = [
    { id: "talhao", label: "Talhão", render: (s) => s.talhao_id },
    { id: "real", label: "Valor real", render: (s) => display(s.real) },
    {
      id: "previsto",
      label: "Valor previsto",
      render: (s) => display(s.previsto),
    },
  ];
  if (task === "regressao")
    columns.push({
      id: "residuo",
      label: "Resíduo · sc/ha",
      render: (s) => format(Number(s.real) - Number(s.previsto), 2),
    });
  return (
    <Panel
      title="Auditoria das previsões"
      actions={<span className="pill">{samples.length} amostras de teste</span>}
    >
      <DataTable
        rows={samples}
        columns={columns}
        rowKey={(s) => s.talhao_id}
        caption="Previsões do conjunto de teste comparadas aos valores reais"
        className="audit"
      />
    </Panel>
  );
}
