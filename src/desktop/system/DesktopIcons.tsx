import { useState } from "react";
import { canAccess } from "../../lib/permissions";
import type { UserRole } from "../../lib/types";
import { modulesForRole } from "./registry";
import { useWindowManager } from "./WindowManager";

interface DesktopIconsProps {
  role: UserRole;
}

export function DesktopIcons({ role }: DesktopIconsProps) {
  const wm = useWindowManager();
  const [selected, setSelected] = useState<string | null>(null);

  const defs = modulesForRole(role).filter((d) => d.showOnDesktop);

  return (
    <div className="pointer-events-none absolute inset-0 z-0 p-3">
      <div className="pointer-events-auto flex max-h-full flex-col flex-wrap content-start gap-1.5">
        {defs.map((def) => {
          const Icon = def.icon;
          const isSel = selected === def.id;
          return (
            <button
              key={def.id}
              type="button"
              onClick={() => setSelected(def.id)}
              onDoubleClick={() => wm.openWindow(def.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") wm.openWindow(def.id);
              }}
              title={`${def.title} — ${def.description}`}
              className={`flex w-24 flex-col items-center gap-1.5 rounded-xl border border-transparent p-2 transition-colors hover:bg-white/40 focus:outline-none ${
                isSel ? "border-sky-400/70 bg-white/50" : ""
              }`}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-300 bg-white text-sky-700 shadow-md">
                <Icon size={22} strokeWidth={1.8} />
              </span>
              <span className="line-clamp-2 rounded bg-white/70 px-1 text-center text-[10px] leading-tight font-semibold text-slate-700">
                {def.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function desktopIconsForRole(role: UserRole) {
  return modulesForRole(role).filter((d) => canAccess(role, d.roles) && d.showOnDesktop);
}
