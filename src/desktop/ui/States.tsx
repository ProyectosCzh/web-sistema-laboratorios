import { Inbox, Loader2, RefreshCw, ServerCrash, type LucideIcon } from "lucide-react";
import { apiErrorToMessage } from "../../lib/errors";

export function LoadingBlock({ label = "Cargando datos…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-400">
      <Loader2 size={22} className="animate-spin text-sky-600" />
      <p className="text-xs font-medium">{label}</p>
    </div>
  );
}

export function EmptyBlock({
  message = "Sin registros para mostrar.",
  icon: Icon = Inbox,
}: {
  message?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-400">
      <Icon size={28} strokeWidth={1.5} />
      <p className="text-xs font-medium">{message}</p>
    </div>
  );
}

export function ErrorBlock({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-500">
      <ServerCrash size={28} strokeWidth={1.5} className="text-rose-400" />
      <p className="max-w-sm text-center text-xs font-medium">{apiErrorToMessage(error)}</p>
      {onRetry && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
          <RefreshCw size={13} /> Reintentar
        </button>
      )}
    </div>
  );
}
