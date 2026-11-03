import { Droplets, Layers, Map, Sprout } from "lucide-react";
import type { DataSummary } from "../../types";
import { format } from "../../lib/domain";
import { Metric } from "../common";
export function DatasetSummary({ summary }: { summary: DataSummary }) {
  return (
    <div className="metrics-grid">
      <Metric
        title="Total de talhões"
        value={format(summary.total_talhoes)}
        note="Registros da base ativa"
        icon={<Layers size={17} />}
      />
      <Metric
        title="Área monitorada"
        value={format(summary.area_total_ha, 1)}
        unit="ha"
        note="Soma das áreas informadas"
        icon={<Map size={17} />}
      />
      <Metric
        title="Produtividade média"
        value={format(summary.produtividade_media, 1)}
        unit="sc/ha"
        note="Rendimento histórico"
        icon={<Sprout size={17} />}
      />
      <Metric
        title="Precipitação média"
        value={format(summary.precipitacao_media, 1)}
        unit="mm"
        note="Acumulado por ciclo"
        icon={<Droplets size={17} />}
      />
    </div>
  );
}
