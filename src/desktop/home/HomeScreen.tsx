import { useMemo } from "react";
import type { UserRole } from "../../lib/types";
import { modulesForRole } from "../system/registry";
import { useNavManager } from "../system/NavManager";

const GROUP_COLORS: Record<string, { bg: string; text: string }> = {
  Panel: { bg: "bg-sky-100", text: "text-sky-700" },
  Operación: { bg: "bg-amber-100", text: "text-amber-700" },
  Catálogos: { bg: "bg-indigo-100", text: "text-indigo-700" },
  Administración: { bg: "bg-emerald-100", text: "text-emerald-700" },
};

interface HomeScreenProps {
  role: UserRole;
}

export function HomeScreen({ role }: HomeScreenProps) {
  const nm = useNavManager();

  const groups = useMemo(() => {
    const defs = modulesForRole(role).filter((d) => d.showOnDesktop);
    const map = new Map<string, typeof defs>();
    for (const def of defs) {
      const list = map.get(def.group) ?? [];
      list.push(def);
      map.set(def.group, list);
    }
    return [...map.entries()];
  }, [role]);

  return (
    <div className="scroll-thin h-full overflow-y-auto p-4 md:p-6">
      {groups.map(([group, defs]) => (
        <section key={group} className="mb-6 last:mb-0">
          <h2 className="home-group-title">{group}</h2>
          <div className="home-card-grid">
            {defs.map((def) => {
              const colors = GROUP_COLORS[group] ?? { bg: "bg-slate-100", text: "text-slate-700" };
              const Icon = def.icon;
              return (
                <button
                  key={def.id}
                  type="button"
                  onClick={() => nm.openModule(def.id)}
                  className="home-card"
                >
                  <span className={`home-card-icon ${colors.bg} ${colors.text}`}>
                    <Icon size={24} strokeWidth={1.8} />
                  </span>
                  <div className="min-w-0">
                    <p className="home-card-title">{def.title}</p>
                    <p className="home-card-desc">{def.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
