import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http, unwrap, unwrapPage, type PageParams } from "../api";
import type {
  Classroom,
  ClassroomStateResult,
  Paginated,
} from "../types";

export interface ClassroomsParams extends PageParams {}

export async function fetchClassrooms(params: ClassroomsParams): Promise<Paginated<Classroom>> {
  return unwrapPage(http.get<Paginated<Classroom>>("/classrooms", { params }));
}

export interface ClassroomWriteInput {
  code: string;
  name: string;
  type: Classroom["type"];
  capacity?: number | null;
  location?: string | null;
  status?: Classroom["status"];
}

export async function createClassroom(input: ClassroomWriteInput): Promise<Classroom> {
  return unwrap(http.post<{ data: Classroom }>("/classrooms", input));
}

export async function updateClassroom(
  id: string,
  input: Partial<ClassroomWriteInput>,
): Promise<Classroom> {
  return unwrap(http.patch<{ data: Classroom }>(`/classrooms/${id}`, input));
}

export async function deleteClassroom(id: string): Promise<void> {
  await http.delete(`/classrooms/${id}`);
}

export interface ClassroomStateQuery {
  date?: string;
  timeSlotId?: string;
}

export async function fetchClassroomState(
  id: string,
  query: ClassroomStateQuery = {},
): Promise<ClassroomStateResult> {
  return unwrap(
    http.get<{ data: ClassroomStateResult }>(`/classrooms/${id}/state`, { params: query }),
  );
}

export function classroomsKey(params?: ClassroomsParams) {
  return params ? ["classrooms", params] : ["classrooms"];
}

export function useClassroomsQuery(params: ClassroomsParams, enabled = true) {
  return useQuery({
    queryKey: classroomsKey(params),
    queryFn: () => fetchClassrooms(params),
    enabled,
    placeholderData: (prev) => prev,
  });
}

export function useClassroomListForPick(enabled = true) {
  return useQuery({
    queryKey: ["classrooms", "pick"],
    queryFn: () => fetchClassrooms({ page: 1, pageSize: 200 }),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useClassroomStateQuery(id: string | null, query: ClassroomStateQuery) {
  return useQuery({
    queryKey: ["classroom-state", id, query],
    queryFn: () => fetchClassroomState(id as string, query),
    enabled: Boolean(id),
    placeholderData: (prev) => prev,
  });
}

function useInvalidateClassroomGraph() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["classrooms"] });
    void qc.invalidateQueries({ queryKey: ["classroom-state"] });
    void qc.invalidateQueries({ queryKey: ["availability-grid"] });
    void qc.invalidateQueries({ queryKey: ["stats"] });
  };
}

export function useClassroomMutations() {
  const invalidate = useInvalidateClassroomGraph();
  const create = useMutation({ mutationFn: createClassroom, onSuccess: invalidate });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ClassroomWriteInput> }) =>
      updateClassroom(id, input),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: deleteClassroom, onSuccess: invalidate });
  return { create, update, remove };
}
