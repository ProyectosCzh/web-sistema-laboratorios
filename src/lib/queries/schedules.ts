import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http, unwrap, unwrapWrapped } from "../api";
import type { Schedule } from "../types";

export interface SchedulesParams {
  classroomId: string;
  semesterId: string;
}

export async function fetchSchedules(params: SchedulesParams): Promise<Schedule[]> {
  return unwrap(http.get<{ data: Schedule[] }>("/schedules", { params }));
}

export interface ScheduleWriteInput {
  classroomId: string;
  semesterId: string;
  subjectId: string;
  teacherId?: string | null;
  dayOfWeek: number;
  timeSlotId: string;
  note?: string | null;
}

interface SchedulePayload {
  classroomId?: string;
  semesterId?: string;
  subjectId?: string;
  teacherId?: string | null;
  dayOfWeek?: number;
  timeSlotId?: string;
  note?: string | null;
}

function schedulePayload(input: Partial<ScheduleWriteInput>): SchedulePayload {
  const payload: SchedulePayload = {};
  if (input.classroomId !== undefined) payload.classroomId = input.classroomId;
  if (input.semesterId !== undefined) payload.semesterId = input.semesterId;
  if (input.subjectId !== undefined) payload.subjectId = input.subjectId;
  if (input.dayOfWeek !== undefined) payload.dayOfWeek = input.dayOfWeek;
  if (input.timeSlotId !== undefined) payload.timeSlotId = input.timeSlotId;
  if (input.teacherId !== undefined) {
    payload.teacherId = input.teacherId === "" ? null : input.teacherId;
  }
  if (input.note !== undefined) {
    payload.note = input.note === "" ? null : input.note;
  }
  return payload;
}

export async function createSchedule(input: ScheduleWriteInput): Promise<Schedule> {
  return unwrapWrapped(
    http.post<{ data: { schedule: Schedule } }>("/schedules", schedulePayload(input)),
    "schedule",
  );
}

export async function updateSchedule(
  id: string,
  input: Partial<ScheduleWriteInput>,
): Promise<Schedule> {
  return unwrapWrapped(
    http.patch<{ data: { schedule: Schedule } }>(`/schedules/${id}`, schedulePayload(input)),
    "schedule",
  );
}

export async function deleteSchedule(id: string): Promise<void> {
  await http.delete(`/schedules/${id}`);
}

export function schedulesKey(params: SchedulesParams) {
  return ["schedules", params];
}

export function useSchedulesQuery(params: SchedulesParams, enabled = true) {
  return useQuery({
    queryKey: schedulesKey(params),
    queryFn: () => fetchSchedules(params),
    enabled,
    placeholderData: (prev) => prev,
  });
}

export function useScheduleMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["schedules"] });
    void qc.invalidateQueries({ queryKey: ["availability-grid"] });
    void qc.invalidateQueries({ queryKey: ["classroom-state"] });
    void qc.invalidateQueries({ queryKey: ["stats"] });
  };
  const create = useMutation({ mutationFn: createSchedule, onSuccess: invalidate });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ScheduleWriteInput> }) =>
      updateSchedule(id, input),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: deleteSchedule, onSuccess: invalidate });
  return { create, update, remove };
}
