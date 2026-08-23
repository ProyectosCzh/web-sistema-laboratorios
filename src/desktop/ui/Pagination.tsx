import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  total?: number;
  onPage: (page: number) => void;
}) {
  const last = Math.max(totalPages, 1);
  return (
    <div className="flex items-center justify-between gap-2 pt-2 text-xs text-slate-500">
      <span>
        Página {Math.min(page, last)} de {last}
        {total !== undefined ? ` · ${total} registro${total === 1 ? "" : "s"}` : ""}
      </span>
      <div className="flex gap-1.5">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft size={13} /> Anterior
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={page >= last}
          onClick={() => onPage(page + 1)}
        >
          Siguiente <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}
