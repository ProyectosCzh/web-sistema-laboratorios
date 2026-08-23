import type { Schedule, User } from "./types";

export function isEncargado(user: User | null): boolean {
  return user?.role === "ENCARGADO";
}

export function canModifySchedule(user: User | null, schedule: Schedule): boolean {
  if (!user) return false;
  return user.role === "ENCARGADO" || schedule.assignedById === user.id;
}

export function canModifyAnnotation(user: User | null, annotationUserId: string): boolean {
  if (!user) return false;
  return user.role === "ENCARGADO" || user.id === annotationUserId;
}