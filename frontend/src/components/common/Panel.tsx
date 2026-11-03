import type { ReactNode } from "react";
export function Panel({
  title,
  eyebrow,
  description,
  actions,
  children,
  className = "",
}: {
  title?: ReactNode;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {(title || eyebrow || actions) && (
        <div className="panel-heading">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            {title && <h2>{title}</h2>}
          </div>
          {actions}
        </div>
      )}
      {description && <p className="muted">{description}</p>}
      {children}
    </section>
  );
}
