import type { Risk } from "../../types";
export function RiskBadge({ risk }: { risk: Risk }) {
  return <span className={`risk risk-${risk.toLowerCase()}`}>{risk}</span>;
}
