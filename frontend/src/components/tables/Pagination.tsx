import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "../../lib/domain";
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.max(0, Math.min(page, pages - 1));
  return (
    <div className="pagination">
      <span>
        {total ? current * pageSize + 1 : 0}–
        {Math.min((current + 1) * pageSize, total)} de {format(total)} registros
      </span>
      <div>
        <button
          aria-label="Página anterior"
          disabled={current === 0}
          onClick={() => onPageChange(current - 1)}
        >
          <ChevronLeft size={15} />
        </button>
        <span>
          {current + 1} / {pages}
        </span>
        <button
          aria-label="Próxima página"
          disabled={current === pages - 1}
          onClick={() => onPageChange(current + 1)}
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
