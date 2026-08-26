import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ModuleInstance } from "./windowTypes";

interface NavManagerValue {
  openModules: ModuleInstance[];
  activeModuleId: string | null;
  homeActive: boolean;
  openModule: (moduleId: string, params?: Record<string, unknown>) => void;
  closeModule: (moduleId: string) => void;
  setActiveModule: (moduleId: string) => void;
  goHome: () => void;
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
  const orderRef = useRef(0);

  const openModule = useCallback((moduleId: string, params?: Record<string, unknown>) => {
    const isMobile = window.innerWidth < 768;

    setHomeActive(false);

    setOpenModules((prev) => {
      const existing = prev.find((m) => m.id === moduleId);

      if (existing) {
        if (params) {
          return prev.map((m) =>
            m.id === moduleId ? { ...m, params } : m
          );
        }
        return prev;
      }

      orderRef.current += 1;
      const next: ModuleInstance = {
        id: moduleId,
        params: params ?? {},
        order: orderRef.current,
      };

      if (isMobile) {
        return [next];
      }

      return [...prev, next];
    });

    setActiveModuleId(moduleId);
  }, []);

  const closeModule = useCallback((moduleId: string) => {
    setOpenModules((prev) => {
      const filtered = prev.filter((m) => m.id !== moduleId);
      return filtered;
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
  }, [openModules]);

  const setActiveModule = useCallback((moduleId: string) => {
    setActiveModuleId(moduleId);
    setHomeActive(false);
  }, []);

  const goHome = useCallback(() => {
    setHomeActive(true);
    setActiveModuleId(null);
  }, []);

  const value = useMemo<NavManagerValue>(
    () => ({
      openModules,
      activeModuleId,
      homeActive,
      openModule,
      closeModule,
      setActiveModule,
      goHome,
    }),
    [openModules, activeModuleId, homeActive, openModule, closeModule, setActiveModule, goHome]
  );

  return (
    <NavManagerCtx.Provider value={value}>{children}</NavManagerCtx.Provider>
  );
}
