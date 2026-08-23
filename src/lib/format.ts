import type { TimeSlot } from "./types";

export function todayISO(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
    .toISOString()
    .slice(0, 10);
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function hhmm(value: string): string {
  return value.slice(0, 5);
}

export function slotRange(slot: Pick<TimeSlot, "startTime" | "endTime">): string {
  return `${hhmm(slot.startTime)}–${hhmm(slot.endTime)}`;
}

export function slotLabel(slot: TimeSlot): string {
  return `${slot.label} (${slotRange(slot)})`;
}

export function weekdayOfISO(dateISO: string): number {
  const d = new Date(`${dateISO}T00:00:00Z`);
  return d.getUTCDay();
}

export function sortByDayAndSlot<T extends { dayOfWeek: number; timeSlot: TimeSlot }>(
  items: T[],
): T[] {
  return [...items].sort(
    (a, b) => a.dayOfWeek - b.dayOfWeek || a.timeSlot.order - b.timeSlot.order,
  );
}
