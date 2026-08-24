import { useMemo } from "react";
import { CircleUserRound, LogOut } from "lucide-react";
import { ROLE_LABELS } from "../../lib/constants";
import type { User } from "../../lib/types";
import { modulesForRole } from "./registry";
import { useWindowManager } from "./WindowManager";

interface StartMenuProps {
  open: boolean;
  onClose: () => void;
  user: User;
  onLogout: () => void;
}

export function StartMenu({ open, onClose, user, onLogout }: StartMenuProps) {
  const wm = useWindowManager();

  const groups = useMemo(() => {
    const defs = modulesForRole(user.role);
    const map = new Map<string, typeof defs>();
    for (const def of defs) {
      const list = map.get(def.group) ?? [];
      list.push(def);
      map.set(def.group, list);
    }
    return [...map.entries()];
  }, [user.role]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[640]" onClick={onClose} aria-hidden="true" />
      <nav className="start-menu" aria-label="Menú de módulos">
        <div className="max-h-[60vh] overflow-y-auto p-2 scroll-thin">
          {groups.map(([group, defs]) => (
            <div key={group} className="mb-1 last:mb-0">
              <p className="px-2 pt-2 pb-1 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                {group}
              </p>
              {defs.map((def) => {
                const Icon = def.icon;
                return (
                  <button
                    key={def.id}
                    type="button"
                    onClick={() => {
                      wm.openWindow(def.id);
                      onClose();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-xs font-medium text-slate-100 transition-colors hover:bg-sky-600/80"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/10 text-sky-300">
                      <Icon size={15} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate">{def.title}</span>
                      <span className="block truncate text-[10px] font-normal text-slate-400">
                        {def.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-white/10 bg-black/30 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <CircleUserRound size={22} className="shrink-0 text-sky-400" />
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold">{user.name}</p>
              <p className="truncate text-[10px] text-slate-400">{ROLE_LABELS[user.role]}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="btn btn-sm border-rose-500/40 bg-rose-600/30 text-rose-100 hover:bg-rose-600/60"
          >
            <LogOut size={13} /> Salir
          </button>
        </div>
      </nav>
    </>
  );
}
