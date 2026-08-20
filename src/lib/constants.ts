import type {
  CellStatus,
  ClassroomType,
  MaintenanceStatus,
  ScheduleType,
  UserRole,
} from "./types";

export const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"] as const;

export const CELL_STATUS_COLORS: Record<
  CellStatus,
  { bg: string; hoverBg: string; text: string; border: string }
> = {
  LIBRE: {
    bg: "bg-emerald-100",
    hoverBg: "hover:bg-emerald-200",
    text: "text-emerald-800",
    border: "border-emerald-200",
  },
  OCUPADA: {
    bg: "bg-red-100",
    hoverBg: "hover:bg-red-200",
    text: "text-red-900",
    border: "border-red-200",
  },
  MANTENIMIENTO: {
    bg: "bg-amber-100",
    hoverBg: "hover:bg-amber-200",
    text: "text-amber-900",
    border: "border-amber-200",
  },
};

export const CELL_STATUS_LABELS: Record<CellStatus, string> = {
  LIBRE: "Libre",
  OCUPADA: "Ocupada",
  MANTENIMIENTO: "Mantenimiento",
};

export const SCHEDULE_TYPE_LABELS: Record<ScheduleType, string> = {
  CLASE: "Clase",
  ACTIVIDAD: "Actividad",
  MANTENIMIENTO: "Mantenimiento",
};

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  REPORTADO: "Reportado",
  EN_PROGRESO: "En progreso",
  COMPLETADO: "Completado",
};

export const MAINTENANCE_STATUS_COLORS: Record<MaintenanceStatus, string> = {
  REPORTADO: "bg-amber-100 text-amber-800",
  EN_PROGRESO: "bg-blue-100 text-blue-800",
  COMPLETADO: "bg-emerald-100 text-emerald-800",
};

export const CLASSROOM_TYPE_LABELS: Record<ClassroomType, string> = {
  LAB_COMPUTACION: "Laboratorio de computación",
  LAB_GENERAL: "Laboratorio general",
  AULA: "Aula",
};

export const CLASSROOM_TYPES: ClassroomType[] = ["LAB_COMPUTACION", "LAB_GENERAL", "AULA"];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  ENCARGADO: "Encargado",
  AYUDANTE: "Ayudante",
};

export const USER_ROLES: UserRole[] = ["ENCARGADO", "AYUDANTE"];

export const ERROR_MESSAGES = {
  VALIDATION_ERROR: "Revisá los datos ingresados",
  AUTH_INVALID_CREDENTIALS: "Email o contraseña incorrectos",
  TOKEN_INVALID: "Tu sesión venció, volvé a iniciar sesión",
  TOKEN_EXPIRED: "Tu sesión venció, volvé a iniciar sesión",
  USER_INACTIVE: "El usuario está desactivado",
  FORBIDDEN: "No tenés permisos para esta acción",
  NOT_FOUND: "El recurso no existe",
  RESERVATION_CONFLICT: "Ese turno ya está ocupado en esta aula",
  EMAIL_IN_USE: "Ese email ya está registrado",
  CLASSROOM_CODE_IN_USE: "Ya existe un aula con ese código",
  USER_HAS_DEPENDENCIES: "No se puede eliminar el usuario porque tiene registros asociados",
  CONFLICT: "Conflicto con un recurso existente",
  RATE_LIMIT_EXCEEDED: "Demasiados intentos, intentá de nuevo más tarde",
  CANNOT_DELETE_SELF: "No podés eliminar tu propio usuario",
  NO_ACTIVE_SEMESTER: "No hay un semestre activo",
  INTERNAL_ERROR: "Ocurrió un error inesperado, intentá de nuevo",
} as const;

export type ErrorCode = keyof typeof ERROR_MESSAGES;
