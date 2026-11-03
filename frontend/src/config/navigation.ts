import {
  ChartNoAxesCombined,
  Database,
  Map,
  SlidersHorizontal,
} from "lucide-react";
export const navigation = [
  { id: "dados", label: "Dados", icon: Database },
  { id: "visualizacao", label: "Dashboard e mapa", icon: Map },
  { id: "modelos", label: "Machine Learning", icon: ChartNoAxesCombined },
  { id: "simulador", label: "Simulador", icon: SlidersHorizontal },
] as const;
export type WorkspaceTab = (typeof navigation)[number]["id"];
