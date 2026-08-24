import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http, unwrapPage, unwrapWrapped, type PageParams } from "../api";
import type { Paginated, Teacher } from "../types";

export interface TeachersParams extends PageParams {}

export async function fetchTeachers(params: TeachersParams): Promise<Paginated<Teacher>> {
  return unwrapPage(http.get<Paginated<Teacher>>("/teachers", { params }));
}

export interface TeacherWriteInput {
  code: string;
  name: string;
  email?: string | null;
  active?: boolean;
}

export async function createTeacher(input: TeacherWriteInput): Promise<Teacher> {
  return unwrapWrapped(
    http.post<{ data: { teacher: Teacher } }>("/teachers", input),
    "teacher",
  );
}

export async function updateTeacher(
  id: string,
  input: Partial<TeacherWriteInput>,
): Promise<Teacher> {
  const payload: Partial<TeacherWriteInput> = {};
  if (typeof input.code === "string" && input.code !== "") payload.code = input.code;
  if (input.name !== undefined) payload.name = input.name;
  if (input.email !== undefined) payload.email = input.email;
  if (input.active !== undefined) payload.active = input.active;
  return unwrapWrapped(
    http.patch<{ data: { teacher: Teacher } }>(`/teachers/${id}`, payload),
    "teacher",
  );
}

export async function deleteTeacher(id: string): Promise<void> {
  await http.delete(`/teachers/${id}`);
}

export function teachersKey(params?: TeachersParams) {
  return params ? ["teachers", params] : ["teachers"];
}

export function useTeachersQuery(params: TeachersParams, enabled = true) {
  return useQuery({
    queryKey: teachersKey(params),
    queryFn: () => fetchTeachers(params),
    enabled,
    placeholderData: (prev) => prev,
  });
}

export function useTeacherMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["teachers"] });
    void qc.invalidateQueries({ queryKey: ["availability-grid"] });
  };
  const create = useMutation({ mutationFn: createTeacher, onSuccess: invalidate });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<TeacherWriteInput> }) =>
      updateTeacher(id, input),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: deleteTeacher, onSuccess: invalidate });
  return { create, update, remove };
}
