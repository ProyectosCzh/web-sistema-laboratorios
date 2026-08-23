import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http, unwrap, unwrapPage } from "../api";
import type { Annotation, Paginated } from "../types";

export interface AnnotationFilters {
  classroomId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchAnnotations(
  params: AnnotationFilters,
): Promise<Paginated<Annotation>> {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== ""),
  );
  return unwrapPage(http.get<Paginated<Annotation>>("/annotations", { params: clean }));
}

export async function createAnnotation(input: {
  classroomId: string;
  content: string;
}): Promise<Annotation> {
  return unwrap(http.post<{ data: Annotation }>("/annotations", input));
}

export async function deleteAnnotation(id: string): Promise<void> {
  await http.delete(`/annotations/${id}`);
}

export function useAnnotationsQuery(params: AnnotationFilters) {
  return useQuery({
    queryKey: ["annotations", params],
    queryFn: () => fetchAnnotations(params),
    placeholderData: (prev) => prev,
  });
}

export function useAnnotationMutations() {
  const qc = useQueryClient();
  const invalidate = () => void qc.invalidateQueries({ queryKey: ["annotations"] });
  const create = useMutation({ mutationFn: createAnnotation, onSuccess: invalidate });
  const remove = useMutation({ mutationFn: deleteAnnotation, onSuccess: invalidate });
  return { create, remove };
}
