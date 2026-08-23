import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http, unwrap, unwrapPage, type PageParams } from "../api";
import type {
  Paginated,
  Reservation,
  ReservationStatus,
  ReservationType,
} from "../types";

export interface ReservationFilters extends PageParams {
  status?: ReservationStatus;
  classroomId?: string;
  semesterId?: string;
  type?: ReservationType;
}

export async function fetchReservations(
  params: ReservationFilters,
): Promise<Paginated<Reservation>> {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== ""),
  );
  return unwrapPage(http.get<Paginated<Reservation>>("/reservations", { params: clean }));
}

export interface ReservationCreateInput {
  classroomId: string;
  semesterId: string;
  type: ReservationType;
  dayOfWeek?: number;
  date?: string;
  timeSlotId: string;
  note?: string | null;
}

export async function createReservation(input: ReservationCreateInput): Promise<Reservation> {
  return unwrap(http.post<{ data: Reservation }>("/reservations", input));
}

export interface ReservationUpdateInput {
  classroomId?: string;
  timeSlotId?: string;
  dayOfWeek?: number;
  date?: string;
  note?: string | null;
}

export async function updateReservation(
  id: string,
  input: ReservationUpdateInput,
): Promise<Reservation> {
  return unwrap(http.patch<{ data: Reservation }>(`/reservations/${id}`, input));
}

export async function updateReservationStatus(
  id: string,
  status: Exclude<ReservationStatus, "PENDIENTE">,
): Promise<Reservation> {
  return unwrap(
    http.patch<{ data: Reservation }>(`/reservations/${id}/status`, { status }),
  );
}

export async function deleteReservation(id: string): Promise<void> {
  await http.delete(`/reservations/${id}`);
}

export function reservationsKey(params?: ReservationFilters) {
  return params ? ["reservations", params] : ["reservations"];
}

export function useReservationsQuery(params: ReservationFilters) {
  return useQuery({
    queryKey: reservationsKey(params),
    queryFn: () => fetchReservations(params),
    placeholderData: (prev) => prev,
  });
}

export function useInvalidateReservationGraph() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["reservations"] });
    void qc.invalidateQueries({ queryKey: ["availability-grid"] });
    void qc.invalidateQueries({ queryKey: ["classroom-state"] });
    void qc.invalidateQueries({ queryKey: ["stats"] });
  };
}

export function useReservationMutations() {
  const invalidate = useInvalidateReservationGraph();
  const create = useMutation({
    mutationFn: createReservation,
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReservationUpdateInput }) =>
      updateReservation(id, input),
    onSuccess: invalidate,
  });
  const setStatus = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: Exclude<ReservationStatus, "PENDIENTE">;
    }) => updateReservationStatus(id, status),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: deleteReservation, onSuccess: invalidate });
  return { create, update, setStatus, remove };
}
