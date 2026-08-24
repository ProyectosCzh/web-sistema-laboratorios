import { Minus, Square, X } from "lucide-react";
import { useRef, type ReactNode, type RefObject } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useWindowManager } from "./WindowManager";
import { computeResize, type WindowInstance } from "./windowTypes";

interface WindowFrameProps {
  win: WindowInstance;
  areaRef: RefObject<HTMLDivElement | null>;
  icon: ReactNode;
  children: ReactNode;
}

const HANDLES = [
  { dir: "n", cls: "top-0 left-3 right-3 h-1.5 cursor-n-resize" },
  { dir: "s", cls: "bottom-0 left-3 right-3 h-1.5 cursor-s-resize" },
  { dir: "e", cls: "right-0 top-3 bottom-3 w-1.5 cursor-e-resize" },
  { dir: "w", cls: "left-0 top-3 bottom-3 w-1.5 cursor-w-resize" },
  { dir: "ne", cls: "top-0 right-0 h-3.5 w-3.5 cursor-ne-resize" },
  { dir: "nw", cls: "top-0 left-0 h-3.5 w-3.5 cursor-nw-resize" },
  { dir: "se", cls: "bottom-0 right-0 h-3.5 w-3.5 cursor-se-resize" },
  { dir: "sw", cls: "bottom-0 left-0 h-3.5 w-3.5 cursor-sw-resize" },
];

export function WindowFrame({ win, areaRef, icon, children }: WindowFrameProps) {
  const wm = useWindowManager();
  const dragState = useRef<{ offX: number; offY: number } | null>(null);

  const focused = wm.focusedId === win.id;

  const startDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (win.maximized || e.button !== 0) return;
    e.preventDefault();
    wm.focusWindow(win.id);
    dragState.current = { offX: e.clientX - win.x, offY: e.clientY - win.y };

    const move = (ev: globalThis.PointerEvent) => {
      const state = dragState.current;
      const area = areaRef.current;
      if (!state || !area) return;
      const bounds = area.getBoundingClientRect();
      const nx = Math.min(
        Math.max(ev.clientX - state.offX, -win.width + 140),
        bounds.width - 140,
      );
      const ny = Math.min(Math.max(ev.clientY - state.offY, 0), bounds.height - 44);
      wm.updateRect(win.id, { x: nx, y: ny });
    };
    const up = () => {
      dragState.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const startResize = (e: ReactPointerEvent<HTMLDivElement>, dir: string) => {
    if (win.maximized || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    wm.focusWindow(win.id);
    const startX = e.clientX;
    const startY = e.clientY;
    const origin = { x: win.x, y: win.y, width: win.width, height: win.height };

    const move = (ev: globalThis.PointerEvent) => {
      const area = areaRef.current;
      if (!area) return;
      const bounds = area.getBoundingClientRect();
      const next = computeResize(
        dir,
        ev.clientX - startX,
        ev.clientY - startY,
        origin,
        bounds.width,
        bounds.height,
      );
      wm.updateRect(win.id, next);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const style = win.maximized
    ? { left: 0, top: 0, width: "100%", height: "100%", zIndex: win.z }
    : { left: win.x, top: win.y, width: win.width, height: win.height, zIndex: win.z };

  return (
    <section
      className={`wimp-window window-animated absolute ${win.maximized ? "rounded-none" : ""} ${
        win.minimized ? "hidden" : ""
      }`}
      style={style}
      role="dialog"
      aria-label={win.title}
      onPointerDown={() => wm.focusWindow(win.id)}
    >
      <div
        className={`wimp-titlebar ${
          focused ? "wimp-titlebar-active" : "wimp-titlebar-inactive"
        }`}
        onPointerDown={startDrag}
        onDoubleClick={() => wm.toggleMaximize(win.id)}
      >
        <div className="flex min-w-0 items-center gap-2 px-1">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center">
            {icon}
          </span>
          <span className="truncate text-xs font-bold tracking-wide">{win.title}</span>
        </div>
        <div
          className="flex items-center gap-1"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="wimp-title-btn"
            aria-label="Minimizar"
            onClick={() => wm.minimizeWindow(win.id)}
          >
            <Minus size={13} />
          </button>
          <button
            type="button"
            className="wimp-title-btn"
            aria-label={win.maximized ? "Restaurar" : "Maximizar"}
            onClick={() => wm.toggleMaximize(win.id)}
          >
            <Square size={11} />
          </button>
          <button
            type="button"
            className="wimp-title-btn wimp-title-btn-danger"
            aria-label="Cerrar"
            onClick={() => wm.closeWindow(win.id)}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="scroll-thin relative min-h-0 flex-1 overflow-hidden bg-white">
        {children}
      </div>

      {!win.maximized &&
        HANDLES.map((h) => (
          <div
            key={h.dir}
            className={`absolute z-[1] ${h.cls}`}
            onPointerDown={(e) => startResize(e, h.dir)}
          />
        ))}
    </section>
  );
}
