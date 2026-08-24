import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http, unwrap, unwrapWrapped } from "../api";
import type { TimeSlot } from "../types";

export async function fetchTimeSlots(): Promise<TimeSlot[]> {
  return unwrap(http.get<{ data: TimeSlot[] }>("/time-slots"));
}

export interface TimeSlotWriteInput {
  label: string;
  startTime: string;
  endTime: string;
  order: number;
}

export async function createTimeSlot(input: TimeSlotWriteInput): Promise<TimeSlot> {
  return unwrapWrapped(
    http.post<{ data: { timeSlot: TimeSlot } }>("/time-slots", input),
    "timeSlot",
  );
}

export async function updateTimeSlot(
  id: string,
  input: Partial<TimeSlotWriteInput>,
): Promise<TimeSlot> {
  return unwrapWrapped(
    http.patch<{ data: { timeSlot: TimeSlot } }>(`/time-slots/${id}`, input),
    "timeSlot",
  );
}

export async function deleteTimeSlot(id: string): Promise<void> {
  await http.delete(`/time-slots/${id}`);
}

export function useTimeSlotsQuery(enabled = true) {
  return useQuery({
    queryKey: ["time-slots"],
    queryFn: fetchTimeSlots,
    enabled,
    staleTime: 10 * 60 * 1000,
  });
}

export function useTimeSlotMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["time-slots"] });
    void qc.invalidateQueries({ queryKey: ["availability-grid"] });
  };
  const create = useMutation({ mutationFn: createTimeSlot, onSuccess: invalidate });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<TimeSlotWriteInput> }) =>
      updateTimeSlot(id, input),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: deleteTimeSlot, onSuccess: invalidate });
  return { create, update, remove };
}
