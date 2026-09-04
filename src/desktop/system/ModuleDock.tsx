import { X } from "lucide-react";
import { useNavManager } from "./NavManager";
import { getModule } from "./registry";

export function ModuleDock() {
  const nm = useNavManager();
  const { openModules, activeModuleId, homeActive, setActiveModule, closeModule, reorderModules } = nm;

  if (openModules.length === 0) return null;

  // Preserve visual order from NavManager (already chronological + drag order)
  // No additional sort — array order is source of truth.
  const tabs = openModules;

  const handleDragStart = (e: React.DragEvent<HTMLButtonElement>, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent<HTMLButtonElement>, targetId: string) => {
    e.preventDefault();
    const fromId = e.dataTransfer.getData("text/plain");
    if (fromId && fromId !== targetId) {
      reorderModules(fromId, targetId);
    }
  };

  return (
    <div className="module-dock scroll-thin" role="tablist" aria-label="Módulos abiertos">
      {tabs.map((mod) => {
        const def = getModule(mod.id);
        const Icon = def?.icon;
        const isActive = activeModuleId === mod.id && !homeActive;
        return (
          <button
            key={mod.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={def?.title ?? mod.id}
            draggable
            onDragStart={(e) => handleDragStart(e, mod.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, mod.id)}
            onClick={() => setActiveModule(mod.id)}
            className={isActive ? "module-dock-tab-active" : "module-dock-tab"}
          >
            {Icon && <Icon size={13} className="shrink-0" aria-hidden />}
            <span className="truncate">{def?.title ?? mod.id}</span>
            <span
              role="button"
              tabIndex={0}
              aria-label={`Cerrar ${def?.title ?? mod.id}`}
              onClick={(e) => {
                e.stopPropagation();
                closeModule(mod.id);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  closeModule(mod.id);
                }
              }}
              className="module-dock-tab-close"
            >
              <X size={12} aria-hidden />
            </span>
          </button>
        );
      })}
    </div>
  );
}
