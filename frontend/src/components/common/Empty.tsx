import type { ReactNode } from "react";
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-symbol">↗</span>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}
