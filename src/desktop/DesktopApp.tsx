import { useEffect, useRef, useState } from "react";
import { getSession, redirectToLogin } from "../lib/session";
import { QueryProvider } from "../providers/QueryProvider";
import { DesktopIcons } from "./system/DesktopIcons";
import { AuthProvider, useAuth } from "./system/AuthContext";
import { DialogProvider } from "./system/DialogHost";
import { ToastProvider } from "./system/ToastProvider";
import { WindowManagerProvider, useWindowManager } from "./system/WindowManager";
import { WindowFrame } from "./system/WindowFrame";
import { Taskbar } from "./system/Taskbar";
import { getModule, getModuleDefaults } from "./system/registry";

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
            <WindowManagerProvider getDefaults={getModuleDefaults}>
              <Shell />
            </WindowManagerProvider>
          </AuthProvider>
        </DialogProvider>
      </ToastProvider>
    </QueryProvider>
  );
}

function Shell() {
  const wm = useWindowManager();
  const areaRef = useRef<HTMLDivElement>(null);

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      <div
        ref={areaRef}
        className="wimp-desktop-bg relative min-h-0 flex-1 overflow-hidden"
      >
        <DesktopArea />
        {wm.windows.map((win) => {
          const def = getModule(win.moduleId);
          if (!def) return null;
          const Component = def.component;
          return (
            <WindowFrame key={win.id} win={win} areaRef={areaRef} icon={<def.icon size={14} />}>
              <Component params={win.params} winId={win.id} />
            </WindowFrame>
          );
        })}
      </div>
      <Taskbar />
    </div>
  );
}

function DesktopArea() {
  const { user } = useAuth();
  return <DesktopIcons role={user.role} />;
}
