import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http, unwrap, unwrapPage, type PageParams } from "../api";
import type { Paginated, Subject } from "../types";

export interface SubjectsParams extends PageParams {}

export async function fetchSubjects(params: SubjectsParams): Promise<Paginated<Subject>> {
  return unwrapPage(http.get<Paginated<Subject>>("/subjects", { params }));
}

export interface SubjectWriteInput {
  code: string;
  name: string;
  active?: boolean;
}

export async function createSubject(input: SubjectWriteInput): Promise<Subject> {
  return unwrap(http.post<{ data: Subject }>("/subjects", input));
}

export async function updateSubject(
  id: string,
  input: Partial<SubjectWriteInput>,
): Promise<Subject> {
  return unwrap(http.patch<{ data: Subject }>(`/subjects/${id}`, input));
}

export async function deleteSubject(id: string): Promise<void> {
  await http.delete(`/subjects/${id}`);
}

export function subjectsKey(params?: SubjectsParams) {
  return params ? ["subjects", params] : ["subjects"];
}

export function useSubjectsQuery(params: SubjectsParams, enabled = true) {
  return useQuery({
    queryKey: subjectsKey(params),
    queryFn: () => fetchSubjects(params),
    enabled,
    placeholderData: (prev) => prev,
  });
}

export function useSubjectMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["subjects"] });
    void qc.invalidateQueries({ queryKey: ["availability-grid"] });
  };
  const create = useMutation({ mutationFn: createSubject, onSuccess: invalidate });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<SubjectWriteInput> }) =>
      updateSubject(id, input),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: deleteSubject, onSuccess: invalidate });
  return { create, update, remove };
}
