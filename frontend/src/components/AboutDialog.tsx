import { useEffect, useRef } from "react";
export default function AboutDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal native-dialog"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="about-title"
    >
      <button
        className="modal-close"
        onClick={onClose}
        aria-label="Fechar informações"
        autoFocus
      >
        ×
      </button>
      <p className="eyebrow">PROJETO ACADÊMICO</p>
      <h2 id="about-title">AgroSense · divisão da equipe</h2>
      <p>
        Disciplina: Tópicos Especiais em Software
        <br />
        Professor: Rhafael Freitas Da Costa
      </p>
      <ul>
        <li>
          <strong>Dev 1 — Fernando:</strong> base, interface e mocks.
        </li>
        <li>
          <strong>Dev 2:</strong> dados, ingestão e validação.
        </li>
        <li>
          <strong>Dev 3:</strong> regressão e produtividade.
        </li>
        <li>
          <strong>Dev 4:</strong> classificação e risco.
        </li>
        <li>
          <strong>Dev 5:</strong> API Python e integração.
        </li>
      </ul>
      <p className="footnote">
        Dados sintéticos e regras didáticas. O back-end e os modelos reais serão
        implementados pelos demais integrantes.
      </p>
    </dialog>
  );
}
