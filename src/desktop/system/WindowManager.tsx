import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Rect, WindowInstance } from "./windowTypes";
import { TASKBAR_HEIGHT } from "./windowTypes";

export interface ModuleDefaults {
  title: string;
  width: number;
  height: number;
}

interface WindowManagerValue {
  windows: WindowInstance[];
  focusedId: string | null;
  openWindow: (moduleId: string, params?: Record<string, unknown>) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  toggleMaximize: (id: string) => void;
  updateRect: (id: string, rect: Partial<Rect>) => void;
}

const WindowManagerCtx = createContext<WindowManagerValue | null>(null);

export function useWindowManager(): WindowManagerValue {
  const ctx = useContext(WindowManagerCtx);
  if (!ctx) throw new Error("useWindowManager debe usarse dentro de WindowManagerProvider");
  return ctx;
}

function clampSize(width: number, height: number): { width: number; height: number } {
  const maxW = Math.max(360, window.innerWidth - 24);
  const maxH = Math.max(260, window.innerHeight - TASKBAR_HEIGHT - 24);
  return {
    width: Math.min(width, maxW),
    height: Math.min(height, maxH),
  };
}

export function WindowManagerProvider({
  getDefaults,
  children,
}: {
  getDefaults: (moduleId: string) => ModuleDefaults | undefined;
  children: ReactNode;
}) {
  const [windows, setWindows] = useState<WindowInstance[]>([]);
  const zRef = useRef(10);
  const seqRef = useRef(0);

  const focusWindow = useCallback((id: string) => {
    setWindows((prev) => {
      const target = prev.find((w) => w.id === id);
      if (!target) return prev;
      const maxZ = prev.reduce((acc, w) => Math.max(acc, w.z), 0);
      zRef.current = maxZ + 1;
      return prev.map((w) =>
        w.id === id ? { ...w, z: maxZ + 1, minimized: false } : w,
      );
    });
  }, []);

  const openWindow = useCallback(
    (moduleId: string, params?: Record<string, unknown>) => {
      const defaults = getDefaults(moduleId);
      if (!defaults) return;
      setWindows((prev) => {
        const existing = prev.find((w) => w.moduleId === moduleId);
        const maxZ = prev.reduce((acc, w) => Math.max(acc, w.z), 0);
        zRef.current = maxZ + 1;
        if (existing) {
          return prev.map((w) =>
            w.id === existing.id
              ? {
                  ...w,
                  z: maxZ + 1,
                  minimized: false,
                  params: params ?? w.params,
                }
              : w,
          );
        }
        seqRef.current += 1;
        const size = clampSize(defaults.width, defaults.height);
        const compact = window.innerWidth < 768;
        const step = (seqRef.current % 8) * 26;
        const x = compact
          ? 6
          : Math.min(48 + step, Math.max(0, window.innerWidth - size.width - 12));
        const y = compact
          ? 6
          : Math.min(28 + step, Math.max(0, window.innerHeight - TASKBAR_HEIGHT - size.height - 12));
        const next: WindowInstance = {
          id: `${moduleId}-${seqRef.current}`,
          moduleId,
          title: defaults.title,
          x,
          y,
          width: size.width,
          height: size.height,
          z: maxZ + 1,
          minimized: false,
          maximized: compact,
          restoreRect: null,
          params: params ?? {},
        };
        return [...prev, next];
      });
    },
    [getDefaults],
  );

  const closeWindow = useCallback((id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, minimized: true } : w)));
  }, []);

  const toggleMaximize = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        if (w.maximized) {
          const restore = w.restoreRect ?? { x: w.x, y: w.y, width: w.width, height: w.height };
          return { ...w, ...restore, maximized: false, restoreRect: null };
        }
        return {
          ...w,
          maximized: true,
          restoreRect: { x: w.x, y: w.y, width: w.width, height: w.height },
        };
      }),
    );
  }, []);

  const updateRect = useCallback((id: string, rect: Partial<Rect>) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, ...rect } : w)));
  }, []);

  const focusedId = useMemo(() => {
    let best: WindowInstance | null = null;
    for (const w of windows) {
      if (w.minimized) continue;
      if (!best || w.z > best.z) best = w;
    }
    return best?.id ?? null;
  }, [windows]);

  const value = useMemo<WindowManagerValue>(
    () => ({
      windows,
      focusedId,
      openWindow,
      closeWindow,
      focusWindow,
      minimizeWindow,
      toggleMaximize,
      updateRect,
    }),
    [
      windows,
      focusedId,
      openWindow,
      closeWindow,
      focusWindow,
      minimizeWindow,
      toggleMaximize,
      updateRect,
    ],
  );

  return (
    <WindowManagerCtx.Provider value={value}>{children}</WindowManagerCtx.Provider>
  );
}
