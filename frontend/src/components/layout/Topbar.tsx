export function Topbar({
  title,
  mock,
  connected,
}: {
  title: string;
  mock: boolean;
  connected: boolean;
}) {
  return (
    <header className="topbar">
      <span className="breadcrumb">
        Workspace <span>/</span>
        <strong>{title}</strong>
      </span>
      <div className="topbar-right">
        <span className={`status-badge ${mock ? "mock" : ""}`} role="status">
          <span className="dot" />
          {mock
            ? "Modo demonstração"
            : connected
              ? "API conectada"
              : "API não conectada"}
        </span>
        <span className="avatar">D1</span>
      </div>
    </header>
  );
}
