// Sincronizar con api/src/types/
export type UserRole = "ENCARGADO" | "AYUDANTE";
export type ClassroomType = "LAB_COMPUTACION" | "LAB_GENERAL" | "AULA";
export type ScheduleType = "CLASE" | "ACTIVIDAD" | "MANTENIMIENTO";
export type MaintenanceStatus = "REPORTADO" | "EN_PROGRESO" | "COMPLETADO";
export type CellStatus = "LIBRE" | "OCUPADA" | "MANTENIMIENTO";

// Sincronizar con api/src/types/
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// Sincronizar con api/src/types/
export interface Classroom {
  id: string;
  code: string;
  name: string;
  type: ClassroomType;
  capacity: number | null;
  location: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// Sincronizar con api/src/types/
export interface TimeSlot {
  id: string;
  label: string; // "1° período"
  startTime: string; // "07:15"
  endTime: string; // "08:45"
  order: number; // 1-9
}

// Sincronizar con api/src/types/
export interface Semester {
  id: string;
  name: string;
  startDate: string; // ISO
  endDate: string; // ISO
  isActive: boolean;
}

// Sincronizar con api/src/types/
export interface Schedule {
  id: string;
  classroomId: string;
  semesterId: string;
  dayOfWeek: number; // 1-6
  timeSlotId: string;
  timeSlot: TimeSlot;
  type: ScheduleType;
  title: string;
  teacher: string | null;
  note: string | null;
  assignedById: string;
  assignedBy: { id: string; name: string };
  updatedAt: string;
}

// Sincronizar con api/src/types/
export interface Annotation {
  id: string;
  classroomId: string;
  userId: string;
  user: { id: string; name: string };
  date: string; // ISO
  content: string;
}

// Sincronizar con api/src/types/
export interface MaintenanceLog {
  id: string;
  classroomId: string;
  classroom: { id: string; code: string; name: string };
  date: string; // ISO (día calendario)
  reason: string;
  status: MaintenanceStatus;
  createdById: string;
  createdAt: string;
}

// Sincronizar con api/src/types/
export interface StatsOverview {
  totalClassrooms: number;
  classroomsByType: { type: ClassroomType; count: number }[];
  activeSemester: { id: string; name: string } | null;
  occupancyByClassroom: {
    classroom: { id: string; code: string; name: string };
    occupiedSlots: number;
    totalSlots: number; // Total de turnos por semana del semestre activo
    percentage: number; // 0-100
  }[];
  pendingMaintenance: number;
}

// Sincronizar con api/src/types/
export interface AuthResponse {
  token: string;
  user: User;
}

// Sincronizar con api/src/types/
export interface ApiErrorDetail {
  field?: string;
  message: string;
}

// Sincronizar con api/src/types/
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
}
