import { BookOpen, Leaf, Sprout } from "lucide-react";
import type { ReactNode } from "react";
import type { WorkspaceTab } from "../../config/navigation";
import { WorkspaceNavigation } from "./WorkspaceNavigation";
export function Sidebar({
  active,
  onNavigate,
  onAbout,
  children,
}: {
  active: WorkspaceTab;
  onNavigate: (tab: WorkspaceTab) => void;
  onAbout: () => void;
  children: ReactNode;
}) {
  return (
    <aside className="sidebar">
      <a
        className="brand"
        href="#"
        onClick={(e) => {
          e.preventDefault();
          onNavigate("dados");
        }}
      >
        <span className="brand-icon">
          <Sprout size={25} />
        </span>
        <div>
          agro<span>sense</span>
          <small>INTELIGÊNCIA AGRÍCOLA</small>
        </div>
      </a>
      <p className="sidebar-label">ÁREA DE ANÁLISE</p>
      <WorkspaceNavigation active={active} onChange={onNavigate} />
      {children}
      <div className="sidebar-bottom">
        <Leaf size={20} />
        <p>
          Tópicos Especiais em Software
          <small>Prof. Rhafael Freitas Da Costa</small>
        </p>
      </div>
      <button className="team-button" onClick={onAbout}>
        <span className="avatar">D1</span>
        <div>
          <strong>Fernando · Dev 1</strong>
          <small>Base e front-end</small>
        </div>
        <BookOpen size={15} />
      </button>
    </aside>
  );
}
