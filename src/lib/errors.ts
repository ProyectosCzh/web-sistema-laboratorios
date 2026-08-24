import type { ApiErrorPayload } from "./types";

export const ERROR_MESSAGES = {
  VALIDATION_ERROR: "Datos inválidos.",
  CANNOT_DELETE_SELF: "No puede eliminar su propia cuenta.",
  CURRENT_PASSWORD_INVALID: "La contraseña actual es incorrecta.",
  INACTIVE_CATALOG_ITEM: "Hay catálogos inactivos en la selección.",
  NON_WORKING_DAY: "El día elegido no es hábil para el semestre.",
  DATE_OUTSIDE_SEMESTER: "La fecha está fuera del rango del semestre.",
  AUTH_INVALID_CREDENTIALS: "Usuario o contraseña incorrectos.",
  TOKEN_INVALID: "Sesión inválida. Inicie sesión nuevamente.",
  TOKEN_EXPIRED: "Su sesión expiró. Inicie sesión nuevamente.",
  USER_INACTIVE: "El usuario está desactivado.",
  FORBIDDEN: "No tiene permisos para realizar esta acción.",
  NOT_FOUND: "Recurso no encontrado.",
  RESERVATION_CONFLICT: "Conflicto de ocupación: la celda ya está tomada.",
  TEACHER_CONFLICT: "El docente ya tiene asignación ese día y bloque en otra aula.",
  CLASSROOM_UNAVAILABLE: "El aula no está disponible (estado o mantenimiento).",
  INVALID_RESERVATION_TRANSITION: "Cambio de estado no permitido para esta reserva.",
  RESERVATION_NOT_EDITABLE: "La reserva ya no es editable.",
  EMAIL_IN_USE: "Ese correo ya está registrado.",
  CLASSROOM_CODE_IN_USE: "Ya existe un aula con ese código.",
  SUBJECT_CODE_IN_USE: "Ya existe una materia con ese código.",
  TEACHER_CODE_IN_USE: "Ya existe un docente con ese código.",
  TEACHER_EMAIL_IN_USE: "Ese correo de docente ya está registrado.",
  TIME_SLOT_ORDER_IN_USE: "Ya existe un turno con ese número de orden.",
  SEMESTER_HAS_DEPENDENCIES: "El semestre tiene horarios o reservas asociadas.",
  SEMESTER_ACTIVE: "No se puede eliminar el semestre activo.",
  TIME_SLOT_IN_USE: "El turno está en uso por horarios existentes.",
  USER_HAS_DEPENDENCIES: "El usuario tiene registros asociados.",
  CONFLICT: "Conflicto con los datos existentes.",
  RATE_LIMIT_EXCEEDED: "Demasiadas solicitudes. Espere unos minutos e intente de nuevo.",
  SERVICE_UNAVAILABLE: "Servicio no disponible. Intente más tarde.",
  INTERNAL_ERROR: "Error interno del servidor.",
} as const;

export type ErrorCode = keyof typeof ERROR_MESSAGES;

export function isApiError(value: unknown): value is ApiErrorPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    typeof (value as { code: unknown }).code === "string"
  );
}

export function apiErrorToMessage(err: unknown): string {
  if (isApiError(err)) {
    const known = (ERROR_MESSAGES as Record<string, string>)[err.code];
    const base = known ?? err.message ?? ERROR_MESSAGES.INTERNAL_ERROR;
    if (err.code === "VALIDATION_ERROR" && err.details && err.details.length > 0) {
      return `${base} ${err.details.map((d) => d.message).join(" · ")}`;
    }
    return base;
  }
  return ERROR_MESSAGES.INTERNAL_ERROR;
}
