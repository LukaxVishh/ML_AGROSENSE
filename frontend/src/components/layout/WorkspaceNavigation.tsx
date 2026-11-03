import { navigation } from "../../config/navigation";
import type { WorkspaceTab } from "../../config/navigation";
export function WorkspaceNavigation({
  active,
  onChange,
  variant = "sidebar",
}: {
  active: WorkspaceTab;
  onChange: (tab: WorkspaceTab) => void;
  variant?: "sidebar" | "tabs";
}) {
  const buttons = navigation.map(({ id, label, icon: Icon }) => (
    <button
      key={id}
      className={active === id ? "active" : ""}
      onClick={() => onChange(id)}
      aria-current={variant === "sidebar" && active === id ? "page" : undefined}
      aria-pressed={variant === "tabs" ? active === id : undefined}
    >
      <Icon size={variant === "tabs" ? 14 : 18} />
      {label}
    </button>
  ));
  return variant === "sidebar" ? (
    <nav aria-label="Navegação principal">{buttons}</nav>
  ) : (
    <div className="tabs" role="group" aria-label="Seções do projeto">
      {buttons}
    </div>
  );
}
