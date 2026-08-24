import {
  BarChart3,
  CalendarCheck,
  CalendarPlus,
  CalendarRange,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  MonitorSmartphone,
  ScanSearch,
  StickyNote,
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
import TeachersModule from "../modules/catalogos/TeachersModule";
import SubjectsModule from "../modules/catalogos/SubjectsModule";
import TimeSlotsModule from "../modules/catalogos/TimeSlotsModule";
import SemestersModule from "../modules/semestres/SemestersModule";
import SchedulesModule from "../modules/planilla/SchedulesModule";
import SupervisionReservasModule from "../modules/reservas/SupervisionReservasModule";
import ReportsModule from "../modules/reportes/ReportsModule";
import WeeklyTableModule from "../modules/tabla/WeeklyTableModule";
import NewReservationModule from "../modules/ayudante/NewReservationModule";
import MyReservationsModule from "../modules/reservas/MyReservationsModule";
import AnnotationsModule from "../modules/anotaciones/AnnotationsModule";
import ClassroomStateModule from "../modules/estado/ClassroomStateModule";

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
    description: "Disponibilidad por aula",
    group: "Operación",
    icon: CalendarRange,
    roles: ["ENCARGADO", "AYUDANTE"],
    showOnDesktop: true,
    width: 900,
    height: 620,
    component: asModule(WeeklyTableModule),
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
    id: "mis-reservas",
    title: "Mis reservas",
    description: "Gestionar sus solicitudes",
    group: "Operación",
    icon: ClipboardList,
    roles: ["AYUDANTE"],
    showOnDesktop: true,
    width: 920,
    height: 580,
    component: asModule(MyReservationsModule),
  },
  {
    id: "anotaciones",
    title: "Anotaciones de uso",
    description: "Historial de incidencias",
    group: "Operación",
    icon: StickyNote,
    roles: ["AYUDANTE"],
    showOnDesktop: true,
    width: 820,
    height: 600,
    component: asModule(AnnotationsModule),
  },
  {
    id: "estado-aula",
    title: "Estado del aula",
    description: "Consulta puntual Libre/Ocupada",
    group: "Operación",
    icon: ScanSearch,
    roles: ["ENCARGADO", "AYUDANTE"],
    showOnDesktop: true,
    width: 640,
    height: 620,
    component: asModule(ClassroomStateModule),
  },
  {
    id: "supervision-reservas",
    title: "Supervisión de reservas",
    description: "Confirmar o cancelar solicitudes",
    group: "Administración",
    icon: CalendarCheck,
    roles: ["ENCARGADO"],
    showOnDesktop: true,
    width: 1000,
    height: 600,
    component: asModule(SupervisionReservasModule),
  },
  {
    id: "planilla",
    title: "Planilla semestral",
    description: "Asignación de bloques fijos",
    group: "Operación",
    icon: Table2,
    roles: ["ENCARGADO"],
    showOnDesktop: false,
    width: 960,
    height: 640,
    component: asModule(SchedulesModule),
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
    id: "materias",
    title: "Materias",
    description: "Catálogo de materias",
    group: "Catálogos",
    icon: GraduationCap,
    roles: ["ENCARGADO"],
    showOnDesktop: false,
    width: 780,
    height: 560,
    component: asModule(SubjectsModule),
  },
  {
    id: "docentes",
    title: "Docentes",
    description: "Registro de docentes",
    group: "Catálogos",
    icon: Users,
    roles: ["ENCARGADO"],
    showOnDesktop: false,
    width: 780,
    height: 560,
    component: asModule(TeachersModule),
  },
  {
    id: "turnos",
    title: "Turnos horarios",
    description: "Bloques horarios oficiales",
    group: "Catálogos",
    icon: CalendarRange,
    roles: ["ENCARGADO"],
    showOnDesktop: false,
    width: 760,
    height: 560,
    component: asModule(TimeSlotsModule),
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
  {
    id: "reportes",
    title: "Consultas y reportes",
    description: "Ocupación, reservas e historial",
    group: "Administración",
    icon: BarChart3,
    roles: ["ENCARGADO"],
    showOnDesktop: false,
    width: 1000,
    height: 620,
    component: asModule(ReportsModule),
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
  "aulas",
  "usuarios",
  "semestres",
  "supervision-reservas",
];

export const DESKTOP_ICON_ORDER_AYU = [
  "dashboard-op",
  "nueva-reserva",
  "tabla-semanal",
  "estado-aula",
  "anotaciones",
  "mis-reservas",
];
