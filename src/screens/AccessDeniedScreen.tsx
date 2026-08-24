import { ShieldAlert } from "lucide-react";

export default function AccessDeniedScreen() {
  return (
    <div className="wimp-desktop-bg flex h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-300 bg-white/95 p-8 text-center shadow-[0_25px_60px_-15px_rgb(15_23_42/0.4)]">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <ShieldAlert size={32} />
        </div>
        <h1 className="mb-2 text-xl font-bold text-slate-800">Acceso denegado</h1>
        <p className="mb-6 text-sm text-slate-600">
          No tienes permisos para entrar a esta sección. Inicia sesión con una cuenta
          autorizada para continuar.
        </p>
        <button
          type="button"
          onClick={() => window.location.replace("/")}
          className="btn btn-primary mx-auto"
        >
          Volver al inicio de sesión
        </button>
      </div>
    </div>
  );
}
