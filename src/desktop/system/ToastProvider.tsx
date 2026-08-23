import {
  CheckCircle2,
  Info,
  TriangleAlert,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ToastKind = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

export interface ToastApi {
  push: (kind: ToastKind, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastCtx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast debe usarse dentro de ToastProvider");
  return ctx;
}

const KIND_META: Record<ToastKind, { icon: LucideIcon; cls: string }> = {
  success: { icon: CheckCircle2, cls: "border-emerald-300 bg-emerald-50 text-emerald-900" },
  error: { icon: XCircle, cls: "border-rose-300 bg-rose-50 text-rose-900" },
  warning: { icon: TriangleAlert, cls: "border-amber-300 bg-amber-50 text-amber-900" },
  info: { icon: Info, cls: "border-sky-300 bg-sky-50 text-sky-900" },
};

const ICON_CLS: Record<ToastKind, string> = {
  success: "text-emerald-600",
  error: "text-rose-600",
  warning: "text-amber-500",
  info: "text-sky-600",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      idRef.current += 1;
      const id = idRef.current;
      setToasts((prev) => [...prev.slice(-4), { id, kind, message }]);
      window.setTimeout(() => dismiss(id), kind === "error" ? 6500 : 4200);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      push,
      success: (m) => push("success", m),
      error: (m) => push("error", m),
      warning: (m) => push("warning", m),
      info: (m) => push("info", m),
    }),
    [push],
  );

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed top-3 right-3 z-[800] flex w-84 max-w-[calc(100vw-24px)] flex-col gap-2">
        {toasts.map((toast) => {
          const meta = KIND_META[toast.kind];
          const Icon = meta.icon;
          return (
            <div
              key={toast.id}
              role="status"
              className={`toast-animated pointer-events-auto flex items-start gap-2.5 rounded-lg border px-3 py-2.5 shadow-lg ${meta.cls}`}
            >
              <Icon size={18} className={`mt-0.5 shrink-0 ${ICON_CLS[toast.kind]}`} />
              <p className="flex-1 text-xs leading-snug font-medium">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="shrink-0 rounded p-0.5 opacity-60 transition hover:opacity-100"
                aria-label="Cerrar notificación"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}
