import { X } from "lucide-react";
import type { ReactNode } from "react";
import type { ModuleInstance } from "./windowTypes";
import { getModule } from "./registry";
import { useNavManager } from "./NavManager";

interface ModulePanelProps {
  module: ModuleInstance;
  children: ReactNode;
}

export function ModulePanel({ module, children }: ModulePanelProps) {
  const nm = useNavManager();
  const def = getModule(module.id);
  const Icon = def?.icon;
  const isActive = nm.activeModuleId === module.id && !nm.homeActive;

  return (
    <div
      className={`module-panel panel-animated ${isActive ? "module-panel-active" : ""}`}
      onClick={() => nm.setActiveModule(module.id)}
    >
      <div className="module-panel-header">
        {Icon && <Icon size={14} className="text-sky-600" />}
        <span className="truncate text-xs font-semibold text-slate-700">
          {def?.title ?? module.id}
        </span>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            nm.closeModule(module.id);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.stopPropagation();
              nm.closeModule(module.id);
            }
          }}
          className="ml-auto flex h-5 w-5 cursor-pointer items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-600"
          aria-label={`Cerrar ${def?.title}`}
        >
          <X size={13} />
        </span>
      </div>
      <div className="module-panel-body">
        {children}
      </div>
    </div>
  );
}
