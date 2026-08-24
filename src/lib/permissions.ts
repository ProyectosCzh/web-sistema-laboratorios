import type { UserRole } from "./types";

export function canAccess(role: UserRole, allowed: UserRole[]): boolean {
  return allowed.includes(role);
}

export function isEncargado(role: UserRole): boolean {
  return role === "ENCARGADO";
}
