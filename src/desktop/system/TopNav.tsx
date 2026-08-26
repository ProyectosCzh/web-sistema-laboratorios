import { LayoutGrid, LogOut, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ROLE_LABELS } from "../../lib/constants";
import { useAuth } from "./AuthContext";
import { getModule } from "./registry";
import { useNavManager } from "./NavManager";

interface TopNavProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

export function TopNav({ onToggleSidebar, sidebarOpen }: TopNavProps) {
  const nm = useNavManager();
  const { user, logout } = useAuth();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const clock = now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

  return (
    <header className="top-nav">
      <button
        type="button"
        onClick={onToggleSidebar}
        className="top-nav-hamburger md:hidden"
      >
        {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      <button
        type="button"
        onClick={nm.goHome}
        className={`top-nav-home ${nm.homeActive ? "active" : ""}`}
      >
        <LayoutGrid size={15} />
        <span className="hidden sm:inline">LABMANAGE</span>
      </button>

      <span className="top-nav-divider" />

      <div className="top-nav-tabs">
        {nm.openModules.map((mod) => {
          const def = getModule(mod.id);
          const Icon = def?.icon;
          const isActive = nm.activeModuleId === mod.id && !nm.homeActive;
          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => nm.setActiveModule(mod.id)}
              className={`top-nav-tab ${isActive ? "active" : ""}`}
            >
              {Icon && <Icon size={13} />}
              <span className="truncate">{def?.title ?? mod.id}</span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  nm.closeModule(mod.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.stopPropagation();
                    nm.closeModule(mod.id);
                  }
                }}
                className="top-nav-tab-close"
              >
                <X size={12} />
              </span>
            </button>
          );
        })}
      </div>

      <div className="top-nav-right">
        <div className="hidden text-right sm:block">
          <p className="text-[11px] leading-tight font-semibold">{user.name}</p>
          <p className="text-[10px] leading-tight text-sky-200">{ROLE_LABELS[user.role]}</p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="top-nav-logout"
          title="Cerrar sesión"
        >
          <LogOut size={15} />
        </button>
        <span className="top-nav-clock">{clock}</span>
      </div>
    </header>
  );
}
