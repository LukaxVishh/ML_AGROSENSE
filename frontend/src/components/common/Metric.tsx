import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
export function Metric({
  title,
  value,
  unit,
  note,
  icon,
}: {
  title: string;
  value: string;
  unit?: string;
  note: string;
  icon: ReactNode;
}) {
  return (
    <article className="metric-card">
      <div className="metric-label">
        {title}
        <span>{icon}</span>
      </div>
      <p className="metric-value">
        {value}
        {unit && <small>{unit}</small>}
      </p>
      <p className="metric-note">
        <ArrowUpRight size={12} />
        {note}
      </p>
    </article>
  );
}
