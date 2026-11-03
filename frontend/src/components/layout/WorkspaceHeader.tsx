import { FlaskConical, Leaf } from "lucide-react";
export function WorkspaceHeader({ mock }: { mock: boolean }) {
  return (
    <>
      <header className="page-heading">
        <div>
          <p className="eyebrow">MONITORAMENTO & ANÁLISE AGRÍCOLA</p>
          <h1>Conheça os dados. Explore a safra.</h1>
          <p className="muted">
            Uma visão integrada de clima, solo e produtividade, do talhão ao
            cenário.
          </p>
        </div>
        <span className="context-tag">
          <Leaf size={14} /> AgroSense / v1.0
        </span>
      </header>
      {mock && (
        <div className="demo-strip">
          <FlaskConical size={15} />
          <span>
            <strong>Ambiente de demonstração.</strong> Dados demonstrativos ou
            arquivos locais. Modelos simulados. Nenhum treinamento de ML é
            executado no navegador.
          </span>
          <span className="small-pill">MOCK</span>
        </div>
      )}
    </>
  );
}
