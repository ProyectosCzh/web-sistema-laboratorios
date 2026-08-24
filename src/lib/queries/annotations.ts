import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http, unwrapPage, unwrapWrapped } from "../api";
import type { Annotation, Paginated } from "../types";

export interface AnnotationListParams {
  classroomId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

const EMPTY_PAGE: Paginated<Annotation> = {
  data: [],
  meta: { page: 1, pageSize: 0, total: 0, totalPages: 0 },
};

function hasClassroomId(params: AnnotationListParams): boolean {
  return typeof params.classroomId === "string" && params.classroomId !== "";
}

export async function fetchAnnotations(
  params: AnnotationListParams,
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
  return unwrapWrapped(
    http.post<{ data: { annotation: Annotation } }>("/annotations", input),
    "annotation",
  );
}

export async function deleteAnnotation(id: string): Promise<void> {
  await http.delete(`/annotations/${id}`);
}

export function useAnnotationsQuery(
  params: AnnotationListParams,
  options?: { enabled?: boolean },
) {
  const enabled = (options?.enabled ?? true) && hasClassroomId(params);
  return useQuery({
    queryKey: ["annotations", params],
    queryFn: () => (hasClassroomId(params) ? fetchAnnotations(params) : Promise.resolve(EMPTY_PAGE)),
    enabled,
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
