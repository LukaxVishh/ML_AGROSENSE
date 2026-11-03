import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
export function Notice({
  children,
  warning = false,
}: {
  children: ReactNode;
  warning?: boolean;
}) {
  return (
    <div
      className={`notice ${warning ? "warning" : ""}`}
      role={warning ? "alert" : undefined}
    >
      <AlertTriangle size={16} />
      <div>{children}</div>
    </div>
  );
}
