import { useEffect, useRef, useState, type ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { createContext, useCallback, useContext } from "react";

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const DialogCtx = createContext<ConfirmFn>(async () => false);

export function useConfirm(): ConfirmFn {
  return useContext(DialogCtx);
}

interface PendingRequest {
  opts: ConfirmOptions;
  resolve: (value: boolean) => void;
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<PendingRequest | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setRequest({ opts, resolve });
      }),
    [],
  );

  const respond = useCallback(
    (value: boolean) => {
      request?.resolve(value);
      setRequest(null);
    },
    [request],
  );

  useEffect(() => {
    if (!request) return;
    confirmBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") respond(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [request, respond]);

  return (
    <DialogCtx.Provider value={confirm}>
      {children}
      {request && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md overflow-hidden rounded-lg border border-slate-400 bg-white shadow-[0_25px_70px_-15px_rgb(15_23_42/0.5)]">
            <div className="flex h-9 items-center gap-2 bg-gradient-to-r from-sky-800 to-sky-600 px-3 text-white">
              <TriangleAlert size={15} />
              <span className="truncate text-xs font-bold tracking-wide">
                {request.opts.title}
              </span>
            </div>
            <div className="px-4 py-4">
              <p className="text-sm leading-relaxed text-slate-700">
                {request.opts.message ?? "¿Confirma esta acción?"}
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => respond(false)}
              >
                {request.opts.cancelText ?? "Cancelar"}
              </button>
              <button
                type="button"
                ref={confirmBtnRef}
                className={`btn btn-sm ${request.opts.danger ? "btn-danger" : "btn-primary"}`}
                onClick={() => respond(true)}
              >
                {request.opts.confirmText ?? "Aceptar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogCtx.Provider>
  );
}
