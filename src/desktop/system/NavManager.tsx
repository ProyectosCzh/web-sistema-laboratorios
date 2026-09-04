import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ModuleInstance } from "./windowTypes";
import {
  readLayout,
  writeLayout,
  sanitizeLayout,
  STORAGE_KEY,
} from "./panelLayout";

interface NavManagerValue {
  openModules: ModuleInstance[];
  activeModuleId: string | null;
  homeActive: boolean;
  panelSizes: Record<string, number>;
  openModule: (moduleId: string, params?: Record<string, unknown>) => void;
  closeModule: (moduleId: string) => void;
  setActiveModule: (moduleId: string) => void;
  goHome: () => void;
  reorderModules: (fromId: string, toId: string) => void;
  setPanelSize: (id: string, pct: number) => void;
  /** Batch-update all left/right columns to exact pct / 100-pct. Keeps rows>1 visually in sync. */
  setColumnRatio: (pct: number) => void;
  resetLayout: () => void;
}

const NavManagerCtx = createContext<NavManagerValue | null>(null);

export function useNavManager(): NavManagerValue {
  const ctx = useContext(NavManagerCtx);
  if (!ctx) throw new Error("useNavManager debe usarse dentro de NavManagerProvider");
  return ctx;
}

export function NavManagerProvider({ children }: { children: ReactNode }) {
  const [openModules, setOpenModules] = useState<ModuleInstance[]>([]);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [homeActive, setHomeActive] = useState(true);
  const [sizes, setSizes] = useState<Record<string, number>>(() => {
    try {
      return readLayout().sizes ?? {};
    } catch {
      return {};
    }
  });
  const orderRef = useRef(0);

  const openModule = useCallback(
    (moduleId: string, params?: Record<string, unknown>) => {
      const isMobile = typeof window !== "undefined" ? window.innerWidth < 768 : false;

      setHomeActive(false);

      const alreadyOpen = openModules.find((m) => m.id === moduleId);

      if (alreadyOpen) {
        if (params) {
          setOpenModules((prev) =>
            prev.map((m) => (m.id === moduleId ? { ...m, params } : m))
          );
        }
        setActiveModuleId(moduleId);
        return;
      }

      orderRef.current += 1;
      const next: ModuleInstance = {
        id: moduleId,
        params: params ?? {},
        order: orderRef.current,
      };

      const nextModules: ModuleInstance[] = isMobile ? [next] : [...openModules, next];
      setOpenModules(nextModules);
      setActiveModuleId(moduleId);

      // sizes distribution for new module
      setSizes((prev) => {
        if (prev[moduleId] !== undefined) return prev;
        const newCount = nextModules.length;
        if (newCount === 0) return prev;
        if (Object.keys(prev).length === 0) {
          const equal = 100 / newCount;
          const eq: Record<string, number> = {};
          for (const m of nextModules) eq[m.id] = equal;
          return eq;
        }
        // preserve existing, give new average share, scale others proportionally
        const avg = 100 / newCount;
        const remaining = 100 - avg;
        const prevTotal = Object.values(prev).reduce((a, b) => a + b, 0);
        const divisor = prevTotal > 0 ? prevTotal : 100;
        const scaled: Record<string, number> = {};
        for (const m of nextModules) {
          if (m.id === moduleId) {
            scaled[m.id] = avg;
          } else {
            const old = prev[m.id] ?? divisor / (newCount - 1);
            scaled[m.id] = (old / divisor) * remaining;
          }
        }
        return scaled;
      });
    },
    [openModules]
  );

  const closeModule = useCallback(
    (moduleId: string) => {
      setOpenModules((prev) => prev.filter((m) => m.id !== moduleId));

      // update sizes: remove entry and normalize remaining to 100
      setSizes((prev) => {
        if (!(moduleId in prev)) return prev;
        const { [moduleId]: _removed, ...rest } = prev;
        const ids = Object.keys(rest);
        if (ids.length === 0) return {};
        const total = Object.values(rest).reduce((a, b) => a + b, 0);
        if (total === 0) {
          const equal = 100 / ids.length;
          const eq: Record<string, number> = {};
          for (const id of ids) eq[id] = equal;
          return eq;
        }
        if (Math.abs(total - 100) > 0.01) {
          const normalized: Record<string, number> = {};
          for (const id of ids) normalized[id] = (rest[id] / total) * 100;
          return normalized;
        }
        return rest;
      });

      setActiveModuleId((prevActive) => {
        if (prevActive !== moduleId) return prevActive;

        const remaining = openModules.filter((m) => m.id !== moduleId);
        if (remaining.length > 0) {
          const sorted = [...remaining].sort((a, b) => b.order - a.order);
          return sorted[0].id;
        }

        setHomeActive(true);
        return null;
      });
    },
    [openModules]
  );

  const setActiveModule = useCallback((moduleId: string) => {
    setActiveModuleId(moduleId);
    setHomeActive(false);
  }, []);

  const goHome = useCallback(() => {
    setHomeActive(true);
    setActiveModuleId(null);
  }, []);

  const reorderModules = useCallback((fromId: string, toId: string) => {
    if (fromId === toId) return;
    setOpenModules((prev) => {
      const fromIdx = prev.findIndex((m) => m.id === fromId);
      const toIdx = prev.findIndex((m) => m.id === toId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(fromIdx, 1);
      // insert before toId (adjust index if removal was before target)
      let insertIdx = toIdx;
      if (fromIdx < toIdx) insertIdx = toIdx - 1;
      copy.splice(insertIdx, 0, moved);
      return copy;
    });
  }, []);

  const setPanelSize = useCallback(
    (id: string, pct: number) => {
      const clamped = Math.max(15, Math.min(70, pct));
      setSizes((prev) => {
        const ids = openModules.map((m) => m.id);
        // if id not in open modules, still allow but handle gracefully
        const effectiveIds = ids.includes(id) ? ids : [...ids, id];
        if (effectiveIds.length === 0) return prev;
        if (effectiveIds.length === 1) {
          return { [id]: 100 };
        }
        const otherIds = effectiveIds.filter((x) => x !== id);
        const otherTotal = otherIds.reduce((sum, oid) => sum + (prev[oid] ?? 0), 0);
        const next: Record<string, number> = {};
        next[id] = clamped;
        const remaining = 100 - clamped;
        if (otherTotal === 0) {
          const equal = remaining / otherIds.length;
          for (const oid of otherIds) next[oid] = equal;
        } else {
          for (const oid of otherIds) {
            const old = prev[oid] ?? 0;
            // proportional scaling; if old is 0 (missing) distribute equally fallback
            const share = old > 0 ? (old / otherTotal) * remaining : remaining / otherIds.length;
            next[oid] = share;
          }
        }
        return next;
      });
    },
    [openModules]
  );

  /**
   * Global column sync: every left column (even index) gets `pct`, every
   * right column (odd index) gets `100-pct`. Solo trailing row (odd count)
   * stays at 100% visually but we store pct for consistency; ModuleStage
   * renders single-item rows at 100% flexBasis regardless.
   * Keeps backwards compatible with setPanelSize; callers may prefer this
   * for drag sync across rows>1 without sequential setPanelSize race.
   */
  const setColumnRatio = useCallback(
    (pct: number) => {
      const clamped = Math.max(15, Math.min(70, pct));
      const ids = openModules.map((m) => m.id);
      if (ids.length === 0) return;
      if (ids.length === 1) {
        setSizes({ [ids[0]]: 100 });
        return;
      }
      const next: Record<string, number> = {};
      const isOddSingleTrailing = ids.length % 2 === 1;
      ids.forEach((id, idx) => {
        const isLeft = idx % 2 === 0;
        const isTrailingSolo = isOddSingleTrailing && idx === ids.length - 1;
        if (isTrailingSolo) {
          // Single panel in last row: keep 100% for full-width rendering
          next[id] = 100;
        } else {
          next[id] = isLeft ? clamped : 100 - clamped;
        }
      });
      setSizes(next);
    },
    [openModules]
  );

  const resetLayout = useCallback(() => {
    try {
      if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    if (openModules.length === 0) {
      setSizes({});
    } else {
      const equal = 100 / openModules.length;
      const eq: Record<string, number> = {};
      for (const m of openModules) eq[m.id] = equal;
      setSizes(eq);
    }
    // reset visual order to chronological order (by order property)
    setOpenModules((prev) => [...prev].sort((a, b) => a.order - b.order));
  }, [openModules]);

  // Persist layout to localStorage
  useEffect(() => {
    const order = openModules.map((m) => m.id);
    const layout = sanitizeLayout(order, { order, sizes });
    // Write sanitized to keep storage valid; also write raw sizes if sanitization adds missing entries
    // Prefer writing the current state order+sizes (sanitized ensures sum ~100 and order filtered)
    // To avoid overwriting sizes state during persist, we write the sanitized layout.
    writeLayout(layout);
  }, [openModules, sizes]);

  const value = useMemo<NavManagerValue>(
    () => ({
      openModules,
      activeModuleId,
      homeActive,
      panelSizes: sizes,
      openModule,
      closeModule,
      setActiveModule,
      goHome,
      reorderModules,
      setPanelSize,
      setColumnRatio,
      resetLayout,
    }),
    [
      openModules,
      activeModuleId,
      homeActive,
      sizes,
      openModule,
      closeModule,
      setActiveModule,
      goHome,
      reorderModules,
      setPanelSize,
      setColumnRatio,
      resetLayout,
    ]
  );

  return <NavManagerCtx.Provider value={value}>{children}</NavManagerCtx.Provider>;
}
