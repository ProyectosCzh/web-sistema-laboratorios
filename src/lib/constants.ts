import type {
  ClassroomStatus,
  ClassroomType,
  MaintenanceStatus,
  ReservationStatus,
  ReservationType,
  UserRole,
} from "./types";

export const APP_NAME = "LABMANAGE";

export const DAY_NAMES: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
};

export const DAY_SHORT: Record<number, string> = {
  1: "Lun",
  2: "Mar",
  3: "Mié",
  4: "Jue",
  5: "Vie",
  6: "Sáb",
};

export const WORKING_DAYS_ALL = [1, 2, 3, 4, 5, 6];

export const ROLE_LABELS: Record<UserRole, string> = {
  ENCARGADO: "Encargado",
  AYUDANTE: "Ayudante de laboratorio",
};

export const CLASSROOM_TYPE_LABELS: Record<ClassroomType, string> = {
  LAB_COMPUTACION: "Lab. computación",
  LAB_GENERAL: "Lab. general",
  AULA: "Aula convencional",
};

export const CLASSROOM_STATUS_LABELS: Record<ClassroomStatus, string> = {
  ACTIVA: "Activa",
  INACTIVA: "Inactiva",
  EN_MANTENIMIENTO: "En mantenimiento",
  FUERA_SERVICIO: "Fuera de servicio",
};

export const RESERVATION_TYPE_LABELS: Record<ReservationType, string> = {
  RECURRENTE: "Semanal",
  PUNTUAL: "Puntual",
};

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  PENDIENTE: "Pendiente",
  CONFIRMADA: "Confirmada",
  CANCELADA: "Cancelada",
};

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  REPORTADO: "Reportado",
  EN_PROGRESO: "En progreso",
  COMPLETADO: "Completado",
};

export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

export const CLASSROOM_STATUS_TONES: Record<ClassroomStatus, Tone> = {
  ACTIVA: "success",
  INACTIVA: "neutral",
  EN_MANTENIMIENTO: "warning",
  FUERA_SERVICIO: "danger",
};

export const RESERVATION_STATUS_TONES: Record<ReservationStatus, Tone> = {
  PENDIENTE: "warning",
  CONFIRMADA: "info",
  CANCELADA: "neutral",
};

export const MAINTENANCE_STATUS_TONES: Record<MaintenanceStatus, Tone> = {
  REPORTADO: "warning",
  EN_PROGRESO: "info",
  COMPLETADO: "success",
};

export const AVAILABILITY_STATE_META: Record<
  string,
  { label: string; description: string; tone: Tone }
> = {
  LIBRE: {
    label: "Libre",
    description: "Disponible para reservar",
    tone: "success",
  },
  OCUPADA: {
    label: "Ocupada",
    description: "En clase o con actividad reservada",
    tone: "danger",
  },
  MANTENIMIENTO: {
    label: "Mantenimiento",
    description: "No disponible para uso",
    tone: "neutral",
  },
};
