import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http, unwrap, unwrapPage } from "../api";
import type { MaintenanceLog, MaintenanceStatus, Paginated } from "../types";

export interface MaintenanceFilters {
  classroomId?: string;
  status?: MaintenanceStatus;
  page?: number;
  pageSize?: number;
}

export async function fetchMaintenanceLogs(
  params: MaintenanceFilters,
): Promise<Paginated<MaintenanceLog>> {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== ""),
  );
  return unwrapPage(http.get<Paginated<MaintenanceLog>>("/maintenance", { params: clean }));
}

export async function createMaintenanceLog(input: {
  classroomId: string;
  date: string;
  reason: string;
}): Promise<MaintenanceLog> {
  return unwrap(http.post<{ data: MaintenanceLog }>("/maintenance", input));
}

export async function updateMaintenanceStatus(
  id: string,
  status: MaintenanceStatus,
): Promise<MaintenanceLog> {
  return unwrap(http.patch<{ data: MaintenanceLog }>(`/maintenance/${id}`, { status }));
}

export async function deleteMaintenanceLog(id: string): Promise<void> {
  await http.delete(`/maintenance/${id}`);
}

export function useMaintenanceQuery(params: MaintenanceFilters) {
  return useQuery({
    queryKey: ["maintenance", params],
    queryFn: () => fetchMaintenanceLogs(params),
    placeholderData: (prev) => prev,
  });
}

export function useMaintenanceMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["maintenance"] });
    void qc.invalidateQueries({ queryKey: ["classrooms"] });
    void qc.invalidateQueries({ queryKey: ["classroom-state"] });
    void qc.invalidateQueries({ queryKey: ["availability-grid"] });
    void qc.invalidateQueries({ queryKey: ["stats"] });
  };
  const create = useMutation({ mutationFn: createMaintenanceLog, onSuccess: invalidate });
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: MaintenanceStatus }) =>
      updateMaintenanceStatus(id, status),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: deleteMaintenanceLog, onSuccess: invalidate });
  return { create, setStatus, remove };
}
