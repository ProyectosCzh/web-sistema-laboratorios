import { LayoutGrid, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { ROLE_LABELS } from "../../lib/constants";
import { useAuth } from "./AuthContext";
import { getModule } from "./registry";
import { StartMenu } from "./StartMenu";
import { useWindowManager } from "./WindowManager";

export function Taskbar() {
  const wm = useWindowManager();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const clock = now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <StartMenu open={menuOpen} onClose={() => setMenuOpen(false)} user={user} onLogout={logout} />
      <footer className="taskbar">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className={`flex h-9 items-center gap-2 rounded-md px-3 text-xs font-bold tracking-wide transition-colors ${
            menuOpen ? "bg-sky-600 text-white" : "bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          <LayoutGrid size={15} />
          Inicio
        </button>

        <span className="mx-1 h-6 w-px bg-white/15" />

        <div className="scroll-thin flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {wm.windows.map((win) => {
            const def = getModule(win.moduleId);
            const Icon = def?.icon;
            const active = wm.focusedId === win.id && !win.minimized;
            return (
              <button
                key={win.id}
                type="button"
                onClick={() => {
                  if (active) {
                    wm.minimizeWindow(win.id);
                  } else {
                    wm.focusWindow(win.id);
                  }
                }}
                title={win.title}
                className={`taskbar-item ${active ? "taskbar-item-active" : ""}`}
              >
                {Icon && <Icon size={14} className="shrink-0 opacity-80" />}
                <span className="truncate">{win.title}</span>
              </button>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-2 pl-2">
          <div className="hidden text-right sm:block">
            <p className="text-[11px] leading-tight font-semibold">{user.name}</p>
            <p className="text-[10px] leading-tight text-slate-400">
              {ROLE_LABELS[user.role]}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-rose-500/40 bg-rose-600/20 text-rose-200 transition-colors hover:bg-rose-600/50 hover:text-white"
          >
            <LogOut size={15} />
          </button>
          <span className="rounded-md bg-black/30 px-2 py-1 font-mono text-xs tabular-nums">
            {clock}
          </span>
        </div>
      </footer>
    </>
  );
}
