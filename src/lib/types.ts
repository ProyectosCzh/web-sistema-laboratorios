export type UserRole = "ENCARGADO" | "AYUDANTE";
export type ClassroomType = "LAB_COMPUTACION" | "LAB_GENERAL" | "AULA";
export type ClassroomStatus = "ACTIVA" | "INACTIVA" | "EN_MANTENIMIENTO" | "FUERA_SERVICIO";
export type ReservationType = "RECURRENTE" | "PUNTUAL";
export type ReservationStatus = "PENDIENTE" | "CONFIRMADA" | "CANCELADA";
export type MaintenanceStatus = "REPORTADO" | "EN_PROGRESO" | "COMPLETADO";
export type ClassroomAvailabilityState = "LIBRE" | "OCUPADA" | "MANTENIMIENTO";

export interface EntityMeta {
  createdAt: string;
  updatedAt: string;
}

export interface User extends EntityMeta {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
}

export interface Teacher extends EntityMeta {
  id: string;
  code: string;
  name: string;
  email: string | null;
  active: boolean;
}

export interface Subject extends EntityMeta {
  id: string;
  code: string;
  name: string;
  active: boolean;
}

export interface Classroom extends EntityMeta {
  id: string;
  code: string;
  name: string;
  type: ClassroomType;
  capacity: number | null;
  location: string | null;
  status: ClassroomStatus;
}

export interface TimeSlot {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  order: number;
}

export interface Semester {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  workingDays: number[];
  isActive: boolean;
}

export interface NamedRef {
  id: string;
  name: string;
}

export interface CatalogRef {
  id: string;
  code: string;
  name: string;
}

export interface Schedule {
  id: string;
  classroomId: string;
  classroom: CatalogRef;
  semesterId: string;
  subjectId: string;
  subject: CatalogRef;
  teacherId: string | null;
  teacher: CatalogRef | null;
  dayOfWeek: number;
  timeSlotId: string;
  timeSlot: TimeSlot;
  note: string | null;
  assignedById: string;
  assignedBy: NamedRef;
  updatedAt: string;
}

export interface Reservation {
  id: string;
  classroomId: string;
  classroom: CatalogRef;
  semesterId: string;
  type: ReservationType;
  dayOfWeek: number | null;
  date: string | null;
  timeSlotId: string;
  timeSlot: TimeSlot;
  status: ReservationStatus;
  note: string | null;
  requestedById: string;
  requestedBy: NamedRef;
  resolvedById: string | null;
  resolvedBy: NamedRef | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnnotationRef {
  id: string;
  code: string;
  name: string;
}

export interface Annotation {
  id: string;
  classroomId: string;
  classroom?: AnnotationRef;
  userId: string;
  user: NamedRef;
  date: string;
  content: string;
  createdAt?: string;
}

export interface MaintenanceLog {
  id: string;
  classroomId: string;
  classroom: CatalogRef;
  date: string;
  reason: string;
  status: MaintenanceStatus;
  createdById?: string;
  createdBy?: NamedRef;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClassroomStateResult {
  classroomId: string;
  classroom: CatalogRef;
  date: string;
  dayOfWeek: number;
  timeSlotId: string;
  state: ClassroomAvailabilityState;
  reason?: string;
  occupiedBy?:
    | { kind: "SCHEDULE"; schedule: Schedule }
    | { kind: "RESERVATION"; reservation: Reservation };
}

export interface AvailabilityGridCell {
  dayOfWeek: number;
  timeSlotId: string;
  entry: null
    | {
        kind: "SCHEDULE";
        scheduleId: string;
        subject: { id: string; code: string; name: string };
        teacher: { id: string; code: string; name: string } | null;
      }
    | {
        kind: "RESERVATION";
        reservationId: string;
        type: ReservationType;
        status: ReservationStatus;
        date: string | null;
      };
}

export interface AvailabilityGridClassroom {
  classroom: CatalogRef;
  maintenance: Array<{ id: string; date: string; reason: string; status: MaintenanceStatus }>;
  cells: AvailabilityGridCell[];
}

export interface AvailabilityGridSemester {
  id: string;
  name: string;
  workingDays: number[];
  startDate: string;
  endDate: string;
}

export interface AvailabilityGrid {
  semester: AvailabilityGridSemester;
  timeSlots: TimeSlot[];
  classrooms: AvailabilityGridClassroom[];
}

export interface StatsOverview {
  totalClassrooms: number;
  classroomsByType: { type: ClassroomType; count: number }[];
  activeSemester: { id: string; name: string } | null;
  occupancyByClassroom: {
    classroom: CatalogRef;
    occupiedSlots: number;
    totalSlots: number;
    percentage: number;
  }[];
  pendingMaintenance: number;
  reservationsByStatus: { status: ReservationStatus; count: number }[];
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

/** FASE 4c: el login ya no entrega token; solo el usuario (tokens en cookies httpOnly). */
export interface AuthPayload {
  user: User;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: ApiErrorDetail[];
}
