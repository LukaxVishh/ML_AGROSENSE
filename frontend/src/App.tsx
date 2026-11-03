import { lazy, Suspense, useState } from "react";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { navigation, type WorkspaceTab } from "./config/navigation";
import { format } from "./lib/domain";
import { useMock } from "./services/agroService";
import { useAgroWorkspace } from "./hooks/useAgroWorkspace";
import AboutDialog from "./components/AboutDialog";
import ModelControls from "./components/models/ModelControls";
import { Loading, Notice, Panel } from "./components/common";
import { Sidebar } from "./components/layout/Sidebar";
import { Topbar } from "./components/layout/Topbar";
import { WorkspaceHeader } from "./components/layout/WorkspaceHeader";
import { WorkspaceNavigation } from "./components/layout/WorkspaceNavigation";
import { DatasetSummary } from "./components/datasets/DatasetSummary";
import { DatasetSelector } from "./components/datasets/DatasetSelector";
import DataPage from "./pages/DataPage";
import SimulatorPage from "./pages/SimulatorPage";
const VisualizationPage = lazy(() => import("./pages/VisualizationPage"));
const ModelPage = lazy(() => import("./pages/ModelPage"));

export default function App() {
  const workspace = useAgroWorkspace();
  const { data, busy, error, config, models, viewTask, preset, connected } =
    workspace;
  const [tab, setTab] = useState<WorkspaceTab>("dados");
  const [about, setAbout] = useState(false);
  async function train() {
    if (await workspace.train()) setTab("modelos");
  }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Ir para o conteúdo
      </a>
      <Sidebar active={tab} onNavigate={setTab} onAbout={() => setAbout(true)}>
        <ModelControls
          config={config}
          onChange={workspace.setConfig}
          onTrain={() => void train()}
          busy={!!busy || !data}
          model={models[config.task]}
        />
      </Sidebar>
      <div className="workspace">
        <Topbar
          title={navigation.find((item) => item.id === tab)!.label}
          mock={useMock}
          connected={connected}
        />
        <main id="main" tabIndex={-1}>
          <WorkspaceHeader mock={useMock} />
          {error && (
            <Notice warning>
              {error}{" "}
              <button
                className="text-button"
                onClick={() => void workspace.load()}
                disabled={!!busy}
              >
                Recarregar base
              </button>
            </Notice>
          )}
          {!data ? (
            busy ? (
              <Loading />
            ) : (
              <Panel title="Conecte uma base para começar">
                <button
                  className="button"
                  onClick={() => void workspace.load()}
                >
                  Tentar novamente
                </button>
              </Panel>
            )
          ) : (
            <>
              <DatasetSummary summary={data.summary} />
              <div className="section-bar">
                <WorkspaceNavigation
                  active={tab}
                  onChange={setTab}
                  variant="tabs"
                />
                {useMock ? (
                  <DatasetSelector
                    value={preset}
                    disabled={!!busy}
                    onChange={(id) => void workspace.load(id)}
                  />
                ) : (
                  <span className="filename">{data.filename}</span>
                )}
              </div>
              {data.mode === "real" &&
                data.validation.warnings.map((message, index) => (
                  <Notice key={index}>{message}</Notice>
                ))}
              {busy && (
                <div className="operation-status" role="status">
                  <LoaderCircle size={14} className="spin" />
                  {busy === "treino"
                    ? useMock
                      ? "Simulando o contrato de treinamento…"
                      : "Treinando o modelo na API…"
                    : "Validando e carregando a base…"}
                </div>
              )}
              <Suspense fallback={<Loading />}>
                <div className="page-content" key={data.dataset_id}>
                  {tab === "dados" ? (
                    <DataPage
                      data={data}
                      onUpload={(file) => void workspace.load(undefined, file)}
                      busy={!!busy}
                    />
                  ) : tab === "visualizacao" ? (
                    <VisualizationPage data={data} />
                  ) : tab === "modelos" ? (
                    <ModelPage
                      models={models}
                      task={viewTask}
                      onTask={workspace.setViewTask}
                    />
                  ) : (
                    <SimulatorPage
                      data={data}
                      models={models}
                      onConnectionChange={workspace.setConnected}
                    />
                  )}
                </div>
              </Suspense>
              <div className="dataset-footer">
                <span>
                  <CheckCircle2 size={12} /> Base ativa ·{" "}
                  {format(data.records.length)} registros
                </span>
                <span>{data.dataset_id}</span>
              </div>
            </>
          )}
          <footer className="page-footer">
            <span>AgroSense · Tópicos Especiais em Software</span>
            <button onClick={() => setAbout(true)}>
              Equipe e responsabilidades ↗
            </button>
          </footer>
        </main>
      </div>
      {about && <AboutDialog onClose={() => setAbout(false)} />}
    </div>
  );
}
