import {
  BarChart3,
  CalendarCheck,
  CalendarPlus,
  CalendarRange,
  ClipboardList,
  LayoutDashboard,
  Library,
  MonitorSmartphone,
  Table2,
  Users,
  Wrench,
} from "lucide-react";
import type { ComponentType } from "react";
import type { UserRole } from "../../lib/types";
import type { ModuleProps } from "./moduleTypes";

export type { ModuleProps };
import DashboardAdmin from "../modules/dashboard/DashboardAdmin";
import DashboardOperativo from "../modules/dashboard/DashboardOperativo";
import UsersModule from "../modules/usuarios/UsersModule";
import ClassroomsModule from "../modules/aulas/ClassroomsModule";
import CatalogosModule from "../modules/catalogos/CatalogosModule";
import SemestersModule from "../modules/semestres/SemestersModule";
import ReservationsModule from "../modules/reservas/ReservationsModule";
import WeeklyScheduleModule from "../modules/tabla/WeeklyScheduleModule";
import NewReservationModule from "../modules/ayudante/NewReservationModule";

export interface ModuleDef {
  id: string;
  title: string;
  description: string;
  group: "Panel" | "Operación" | "Catálogos" | "Administración";
  icon: ComponentType<{ size?: number | string; className?: string; strokeWidth?: number }>;
  roles: UserRole[];
  showOnDesktop: boolean;
  width: number;
  height: number;
  component: ComponentType<ModuleProps>;
}

const asModule =
  <P extends { params: Record<string, unknown> }>(C: ComponentType<P>): ComponentType<ModuleProps> =>
  (props) =>
    <C {...(props as unknown as P)} />;

export const MODULES: ModuleDef[] = [
  {
    id: "dashboard-admin",
    title: "Panel Encargado",
    description: "Resumen general del sistema",
    group: "Panel",
    icon: LayoutDashboard,
    roles: ["ENCARGADO"],
    showOnDesktop: true,
    width: 860,
    height: 600,
    component: asModule(DashboardAdmin),
  },
  {
    id: "dashboard-op",
    title: "Panel operativo",
    description: "Estado actual y próximos usos",
    group: "Panel",
    icon: MonitorSmartphone,
    roles: ["AYUDANTE"],
    showOnDesktop: true,
    width: 780,
    height: 560,
    component: asModule(DashboardOperativo),
  },
  {
    id: "tabla-semanal",
    title: "Tabla Semanal",
    description: "Disponibilidad y planilla por aula",
    group: "Operación",
    icon: CalendarRange,
    roles: ["ENCARGADO", "AYUDANTE"],
    showOnDesktop: true,
    width: 960,
    height: 640,
    component: asModule(WeeklyScheduleModule),
  },
  {
    id: "nueva-reserva",
    title: "Nueva reserva",
    description: "Solicitar uso de un aula",
    group: "Operación",
    icon: CalendarPlus,
    roles: ["ENCARGADO", "AYUDANTE"],
    showOnDesktop: false,
    width: 560,
    height: 640,
    component: asModule(NewReservationModule),
  },
  {
    id: "reservas",
    title: "Reservas y anotaciones",
    description: "Gestión de reservas y observaciones",
    group: "Operación",
    icon: ClipboardList,
    roles: ["ENCARGADO", "AYUDANTE"],
    showOnDesktop: true,
    width: 960,
    height: 600,
    component: asModule(ReservationsModule),
  },
  {
    id: "usuarios",
    title: "Usuarios",
    description: "Gestión de cuentas y accesos",
    group: "Administración",
    icon: Users,
    roles: ["ENCARGADO"],
    showOnDesktop: true,
    width: 900,
    height: 580,
    component: asModule(UsersModule),
  },
  {
    id: "aulas",
    title: "Aulas y mantenimientos",
    description: "Inventario físico del laboratorio",
    group: "Administración",
    icon: Wrench,
    roles: ["ENCARGADO"],
    showOnDesktop: true,
    width: 940,
    height: 600,
    component: asModule(ClassroomsModule),
  },
  {
    id: "catalogos",
    title: "Catálogos",
    description: "Materias, docentes y horarios",
    group: "Catálogos",
    icon: Library,
    roles: ["ENCARGADO"],
    showOnDesktop: true,
    width: 820,
    height: 580,
    component: asModule(CatalogosModule),
  },
  {
    id: "semestres",
    title: "Semestres",
    description: "Períodos académicos",
    group: "Administración",
    icon: CalendarCheck,
    roles: ["ENCARGADO"],
    showOnDesktop: true,
    width: 860,
    height: 600,
    component: asModule(SemestersModule),
  },
];

export function getModule(id: string): ModuleDef | undefined {
  return MODULES.find((m) => m.id === id);
}

export function modulesForRole(role: UserRole): ModuleDef[] {
  return MODULES.filter((m) => m.roles.includes(role));
}

export function getModuleDefaults(id: string) {
  const def = getModule(id);
  if (!def) return undefined;
  return { width: def.width, height: def.height, title: def.title };
}

export const DESKTOP_ICON_ORDER_ENC = [
  "dashboard-admin",
  "tabla-semanal",
  "reservas",
  "aulas",
  "usuarios",
  "catalogos",
  "semestres",
];

export const DESKTOP_ICON_ORDER_AYU = [
  "dashboard-op",
  "tabla-semanal",
  "reservas",
  "nueva-reserva",
];
