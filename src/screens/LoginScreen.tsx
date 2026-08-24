import { Eye, EyeOff, Loader2, LockKeyhole, LogIn, School } from "lucide-react";
import { useEffect, useState, type SyntheticEvent } from "react";
import { APP_NAME } from "../lib/constants";
import { apiErrorToMessage } from "../lib/errors";
import { useLoginMutation } from "../lib/queries/auth";
import { getSession, redirectToDesktop } from "../lib/session";
import { QueryProvider } from "../providers/QueryProvider";

export default function LoginScreen() {
  return (
    <QueryProvider>
      <LoginForm />
    </QueryProvider>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const login = useLoginMutation();

  useEffect(() => {
    if (getSession()) redirectToDesktop();
  }, []);

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Ingrese usuario y contraseña.");
      return;
    }
    login.mutate(
      { email: email.trim(), password },
      {
        onSuccess: () => redirectToDesktop(),
        onError: (err) => setError(apiErrorToMessage(err)),
      },
    );
  };

  return (
    <div className="wimp-desktop-bg flex h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-300 bg-white/95 shadow-[0_25px_60px_-15px_rgb(15_23_42/0.4)]"
        >
          <div className="flex items-center gap-3 border-b border-slate-200 bg-gradient-to-r from-sky-800 to-sky-600 px-6 py-5 text-white rounded-t-xl">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">
              <School size={22} />
            </span>
            <div>
              <p className="text-base leading-tight font-bold tracking-wide">{APP_NAME}</p>
              <p className="text-xs text-sky-100/90">Gestión de aulas y laboratorios</p>
            </div>
          </div>

          <div className="space-y-4 px-6 py-6">
            <div>
              <label htmlFor="login-email" className="label-base">
                Usuario
              </label>
              <input
                id="login-email"
                type="text"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@institucion.edu"
                className="input-base"
                disabled={login.isPending}
              />
            </div>

            <div>
              <label htmlFor="login-password" className="label-base">
                Contraseña
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-slate-400">
                  <LockKeyhole size={16} />
                </span>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-base pr-9 pl-8"
                  disabled={login.isPending}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
              >
                {error}
              </p>
            )}

            <button type="submit" disabled={login.isPending} className="btn btn-primary w-full">
              {login.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Verificando…
                </>
              ) : (
                <>
                  <LogIn size={16} /> Iniciar sesión
                </>
              )}
            </button>

            <div className="text-center">
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="text-xs text-sky-700 hover:underline"
                title="Contacte al Encargado para restablecer su contraseña"
              >
                ¿Olvidaste tu contraseña?
              </a>
            </div>
          </div>
        </form>
        <p className="mt-4 text-center text-[11px] text-slate-500">
          Sistema de gestión de aulas · Acceso restringido a personal autorizado
        </p>
      </div>
    </div>
  );
}
