import type {
  CellStatus,
  ClassroomStatus,
  ClassroomType,
  CourseOfferingType,
  MaintenanceStatus,
  UserRole,
} from "./types";

export const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"] as const;

export const CELL_STATUS_LABELS: Record<CellStatus, string> = {
  LIBRE: "Libre",
  OCUPADA: "Ocupada",
};

export const CELL_STATUS_COLORS: Record<CellStatus, { bg: string; hoverBg: string; text: string; border: string }> = {
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
};

export const CLASSROOM_STATUS_LABELS: Record<ClassroomStatus, string> = {
  ACTIVA: "Activa",
  INACTIVA: "Inactiva",
  EN_MANTENIMIENTO: "En mantenimiento",
  FUERA_SERVICIO: "Fuera de servicio",
};

export const CLASSROOM_STATUS_COLORS: Record<ClassroomStatus, string> = {
  ACTIVA: "bg-emerald-100 text-emerald-800",
  INACTIVA: "bg-gray-200 text-gray-700",
  EN_MANTENIMIENTO: "bg-amber-100 text-amber-800",
  FUERA_SERVICIO: "bg-red-100 text-red-800",
};

export const CLASSROOM_TYPES: ClassroomType[] = ["LAB_COMPUTACION", "LAB_GENERAL", "AULA"];

export const CLASSROOM_TYPE_LABELS: Record<ClassroomType, string> = {
  LAB_COMPUTACION: "Laboratorio de computación",
  LAB_GENERAL: "Laboratorio general",
  AULA: "Aula",
};

export const COURSE_OFFERING_TYPES: CourseOfferingType[] = ["CLASE", "EXTRACURRICULAR", "ACTIVIDAD"];

export const COURSE_OFFERING_TYPE_LABELS: Record<CourseOfferingType, string> = {
  CLASE: "Clase",
  EXTRACURRICULAR: "Extracurricular",
  ACTIVIDAD: "Actividad",
};

export const MAINTENANCE_STATUSES: MaintenanceStatus[] = ["REPORTADO", "EN_PROGRESO", "COMPLETADO"];

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
  TEACHER_CONFLICT: "El docente ya tiene una clase en ese horario",
  OFFERING_CONFLICT: "La comisión ya está asignada en otro aula a esa hora",
  CLASSROOM_UNAVAILABLE: "El aula no está disponible (inactiva o en mantenimiento)",
  SEMESTER_MISMATCH: "La comisión pertenece a otro semestre",
  INACTIVE_CATALOG_ITEM: "No se puede usar un elemento inactivo (materia, docente o comisión)",
  EMAIL_IN_USE: "Ese email ya está registrado",
  CLASSROOM_CODE_IN_USE: "Ya existe un aula con ese código",
  SUBJECT_CODE_IN_USE: "Ya existe una materia con ese código",
  TEACHER_CODE_IN_USE: "Ya existe un docente con ese código",
  TEACHER_EMAIL_IN_USE: "Ese email ya está registrado en un docente",
  OFFERING_ALREADY_EXISTS: "Ya existe esa comisión (semestre, materia, sección, docente)",
  CANNOT_DELETE_SELF: "No podés eliminar tu propio usuario",
  NO_ACTIVE_SEMESTER: "No hay un semestre activo",
  CONFLICT: "Conflicto con un recurso existente",
  RATE_LIMIT_EXCEEDED: "Demasiados intentos, intentá de nuevo más tarde",
  INTERNAL_ERROR: "Ocurrió un error inesperado, intentá de nuevo",
} as const;

export type ErrorCode = keyof typeof ERROR_MESSAGES;