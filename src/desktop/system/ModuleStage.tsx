import { Fragment, useCallback, useRef } from "react";
import { useNavManager } from "./NavManager";
import { getModule } from "./registry";
import { ModulePanel } from "./ModulePanel";
import { ResizeHandle } from "./ResizeHandle";

export function ModuleStage() {
  const nm = useNavManager();
  const { openModules, panelSizes, setPanelSize, setColumnRatio } = nm;
  const containerRef = useRef<HTMLDivElement>(null);

  // drag state refs to survive renders without re-creating listeners
  const dragRef = useRef<{
    startX: number;
    containerWidth: number;
    rowIdx: number;
    leftId: string;
    leftPct: number;
  } | null>(null);

  const handleMouseDown = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement>,
      leftId: string,
      rowIdx: number
    ) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const width = rect.width;
      if (width === 0) return;
      // fallback to 50% for 2-col rows; 100% is handled via flexBasis for single rows
      const leftPct = panelSizes[leftId] ?? 50;
      dragRef.current = {
        startX: e.clientX,
        containerWidth: width,
        rowIdx,
        leftId,
        leftPct,
      };

      const onMouseMove = (ev: MouseEvent) => {
        const cur = dragRef.current;
        if (!cur) return;
        const deltaPct =
          ((ev.clientX - cur.startX) / cur.containerWidth) * 100;
        let newLeft = cur.leftPct + deltaPct;
        newLeft = Math.max(15, Math.min(70, newLeft));
        // Global synchronized horizontal resize — use batch setter when available
        // for true column sync (all left cols = newLeft, all right cols = 100-newLeft).
        // Fallback to single setPanelSize keeps rows>1 compilable but only proportionally scales others.
        if (setColumnRatio) {
          setColumnRatio(newLeft);
        } else {
          setPanelSize(cur.leftId, newLeft);
        }
      };

      const onMouseUp = () => {
        dragRef.current = null;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
      };

      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [panelSizes, setPanelSize, setColumnRatio]
  );

  if (openModules.length === 0) return null;

  // Unified grid: chunk openModules into rows of 2 for consistent 90vh snap layout.
  // For 1-2 modules this still yields a single row (90vh, snap works) with flexBasis from panelSizes.
  const rows: typeof openModules[] = [];
  for (let i = 0; i < openModules.length; i += 2) {
    rows.push(openModules.slice(i, i + 2));
  }

  return (
    <div ref={containerRef} className="module-stage module-stage--grid scroll-thin">
      {rows.map((row, rowIdx) => (
        <div key={`row-${rowIdx}`} className="module-stage-row">
          {row.map((mod, colIdx) => {
            const def = getModule(mod.id);
            if (!def) return null;
            const Component = def.component;
            const pct = panelSizes[mod.id] ?? (row.length === 1 ? 100 : 50);
            const showHandle = colIdx === 0 && row.length === 2;
            return (
              <Fragment key={mod.id}>
                <div
                  className="module-stage-panel"
                  style={{
                    flexBasis: row.length === 1 ? "100%" : `${pct}%`,
                    flexGrow: 1,
                    flexShrink: 1,
                  }}
                >
                  <ModulePanel module={mod}>
                    <Component params={mod.params} winId={mod.id} />
                  </ModulePanel>
                </div>
                {showHandle && (
                  <ResizeHandle
                    onMouseDown={(e) => handleMouseDown(e, mod.id, rowIdx)}
                  />
                )}
              </Fragment>
            );
          })}
        </div>
      ))}
    </div>
  );
}
