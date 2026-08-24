import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http, unwrapPage, unwrapWrapped, type PageParams } from "../api";
import type { Paginated, Semester } from "../types";

export interface SemestersParams extends PageParams {}

export async function fetchSemesters(params: SemestersParams): Promise<Paginated<Semester>> {
  return unwrapPage(http.get<Paginated<Semester>>("/semesters", { params }));
}

export interface SemesterWriteInput {
  name: string;
  startDate: string;
  endDate: string;
  workingDays: number[];
}

export async function createSemester(input: SemesterWriteInput): Promise<Semester> {
  return unwrapWrapped(
    http.post<{ data: { semester: Semester } }>("/semesters", input),
    "semester",
  );
}

export async function updateSemester(
  id: string,
  input: Partial<SemesterWriteInput>,
): Promise<Semester> {
  return unwrapWrapped(
    http.patch<{ data: { semester: Semester } }>(`/semesters/${id}`, input),
    "semester",
  );
}

export async function activateSemester(id: string): Promise<Semester> {
  return unwrapWrapped(http.post<{ data: { semester: Semester } }>(`/semesters/${id}/activate`), "semester");
}

export async function deleteSemester(id: string): Promise<void> {
  await http.delete(`/semesters/${id}`);
}

export function semestersKey(params?: SemestersParams) {
  return params ? ["semesters", params] : ["semesters"];
}

export function useSemestersQuery(params: SemestersParams, enabled = true) {
  return useQuery({
    queryKey: semestersKey(params),
    queryFn: () => fetchSemesters(params),
    enabled,
    placeholderData: (prev) => prev,
  });
}

export function useActiveSemester(): Semester | null {
  const params: SemestersParams = { page: 1, pageSize: 50 };
  const query = useQuery({
    queryKey: semestersKey(params),
    queryFn: () => fetchSemesters(params),
    staleTime: 60 * 1000,
  });
  const list = query.data?.data ?? [];
  return list.find((s) => s.isActive) ?? null;
}

export function useSemesterMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["semesters"] });
    void qc.invalidateQueries({ queryKey: ["availability-grid"] });
    void qc.invalidateQueries({ queryKey: ["stats"] });
    void qc.invalidateQueries({ queryKey: ["schedules"] });
  };
  const create = useMutation({ mutationFn: createSemester, onSuccess: invalidate });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<SemesterWriteInput> }) =>
      updateSemester(id, input),
    onSuccess: invalidate,
  });
  const activate = useMutation({
    mutationFn: activateSemester,
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: deleteSemester, onSuccess: invalidate });
  return { create, update, activate, remove };
}
