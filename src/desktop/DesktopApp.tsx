import { useMemo, useState } from "react";
import { useEffect } from "react";
import { getSession, redirectToLogin } from "../lib/session";
import type { UserRole } from "../lib/types";
import { modulesForRole } from "./system/registry";
import { QueryProvider } from "../providers/QueryProvider";
import { AuthProvider, useAuth } from "./system/AuthContext";
import { DialogProvider } from "./system/DialogHost";
import { ToastProvider } from "./system/ToastProvider";
import { NavManagerProvider, useNavManager } from "./system/NavManager";
import { TopNav } from "./system/TopNav";
import { ModuleStage } from "./system/ModuleStage";
import { ModuleDock } from "./system/ModuleDock";
import { HomeScreen } from "./home/HomeScreen";

export default function DesktopApp() {
  const [session] = useState(() => getSession());

  useEffect(() => {
    if (!session) redirectToLogin();
  }, [session]);

  if (!session) {
    return (
      <div className="wimp-desktop-bg flex h-full items-center justify-center">
        <p className="text-xs text-slate-500">Redirigiendo al inicio de sesión…</p>
      </div>
    );
  }

  return (
    <QueryProvider>
      <ToastProvider>
        <DialogProvider>
          <AuthProvider user={session.user}>
            <NavManagerProvider>
              <Shell />
            </NavManagerProvider>
          </AuthProvider>
        </DialogProvider>
      </ToastProvider>
    </QueryProvider>
  );
}

function Shell() {
  const nm = useNavManager();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <TopNav
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        sidebarOpen={sidebarOpen}
      />
      <div className="app-body">
        {sidebarOpen && (
          <div
            className="sidebar-backdrop md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
          <nav className="scroll-thin flex flex-1 flex-col overflow-y-auto p-2">
            <SidebarContent
              role={user.role}
              onNavigate={() => setSidebarOpen(false)}
            />
          </nav>
        </aside>

        <main className="app-content flex flex-col overflow-hidden">
          {nm.homeActive ? (
            <HomeScreen role={user.role} />
          ) : (
            <>
              <ModuleStage />
              <ModuleDock />
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  role,
  onNavigate,
}: {
  role: UserRole;
  onNavigate: () => void;
}) {
  const nm = useNavManager();

  const groups = useMemo(() => {
    const defs = modulesForRole(role);
    const map = new Map<string, typeof defs>();
    for (const def of defs) {
      const list = map.get(def.group) ?? [];
      list.push(def);
      map.set(def.group, list);
    }
    return [...map.entries()];
  }, [role]);

  return (
    <>
      {groups.map(([group, items]) => (
        <div key={group} className="mb-3">
          <p className="sidebar-group-label">{group}</p>
          {items.map((def) => {
            const Icon = def.icon;
            return (
              <button
                key={def.id}
                type="button"
                onClick={() => {
                  nm.openModule(def.id);
                  onNavigate();
                }}
                className={`sidebar-item ${
                  nm.activeModuleId === def.id && !nm.homeActive
                    ? "sidebar-item-active"
                    : ""
                }`}
              >
                <Icon size={16} />
                <span>{def.title}</span>
              </button>
            );
          })}
        </div>
      ))}
    </>
  );
}
