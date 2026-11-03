import { useState } from "react";
import { ArrowDownToLine, FileSpreadsheet, UploadCloud } from "lucide-react";
export function DatasetUpload({
  onUpload,
  busy,
}: {
  onUpload: (file: File) => void;
  busy: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  return (
    <section className="upload-banner">
      <div
        className={`dropzone ${dragging ? "dragging" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!busy && e.dataTransfer.files[0])
            onUpload(e.dataTransfer.files[0]);
        }}
      >
        <span className="upload-icon">
          <UploadCloud size={24} />
        </span>
        <div>
          <h2>Uma nova base, novas perspectivas.</h2>
          <p>
            Arraste seu arquivo CSV, JSON ou XML. Até 2 MB e 10.000 registros.
          </p>
        </div>
        <label className={`button secondary ${busy ? "disabled" : ""}`}>
          <UploadCloud size={14} />
          Importar dados
          <input
            type="file"
            accept=".csv,.json,.xml"
            disabled={busy}
            className="visually-hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <div className="sample-links">
        <span>
          <FileSpreadsheet size={13} />
          Precisa de uma base? Baixe um exemplo sintético:
        </span>
        {[
          { label: "Soja · CSV", file: "safra_soja.csv" },
          { label: "Milho · JSON", file: "safra_milho.json" },
          { label: "Algodão · XML", file: "safra_algodao.xml" },
        ].map((example) => (
          <a href={`/examples/${example.file}`} download key={example.file}>
            {example.label}
            <ArrowDownToLine size={12} />
          </a>
        ))}
      </div>
    </section>
  );
}
