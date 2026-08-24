import { useEffect, useMemo, useState } from "react";
import type { TimeSlot } from "../../lib/types";

export function findCurrentSlot(
  timeSlots: TimeSlot[],
  now: Date = new Date(),
): TimeSlot | null {
  const minutes = now.getHours() * 60 + now.getMinutes();
  for (const slot of timeSlots) {
    const [sh, sm, eh, em] = [
      slot.startTime.slice(0, 2),
      slot.startTime.slice(3, 5),
      slot.endTime.slice(0, 2),
      slot.endTime.slice(3, 5),
    ].map((v) => Number(v));
    if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) continue;
    const start = sh * 60 + sm;
    const end = eh * 60 + em;
    if (minutes >= start && minutes < end) return slot;
  }
  return null;
}

export function useCurrentTimeSlot(timeSlots: TimeSlot[] | undefined): TimeSlot | null {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return useMemo(
    () => (timeSlots && timeSlots.length > 0 ? findCurrentSlot(timeSlots, now) : null),
    [timeSlots, now],
  );
}
