import { useQuery } from "@tanstack/react-query";
import { http, unwrap } from "../api";
import type { AvailabilityGrid, StatsOverview } from "../types";

export async function fetchStats(): Promise<StatsOverview> {
  return unwrap(http.get<{ data: StatsOverview }>("/stats/overview"));
}

const STATS_STALE = 2 * 60 * 1000;
const GRID_STALE = 60 * 1000;
const GRID_GC = 10 * 60 * 1000;

export function useStatsQuery(enabled = true) {
  return useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
    enabled,
    staleTime: STATS_STALE,
  });
}

export interface AvailabilityGridParams {
  semesterId: string;
  classroomId?: string;
  includePuntual?: boolean;
}

export async function fetchAvailabilityGrid(
  params: AvailabilityGridParams,
): Promise<AvailabilityGrid> {
  const clean = Object.fromEntries(
    Object.entries({
      semesterId: params.semesterId,
      classroomId: params.classroomId,
      includePuntual:
        params.includePuntual === undefined ? undefined : String(params.includePuntual),
    }).filter(([, v]) => v !== undefined && v !== ""),
  );
  return unwrap(http.get<{ data: AvailabilityGrid }>("/availability/grid", { params: clean }));
}

export function availabilityKey(params: AvailabilityGridParams) {
  return ["availability-grid", params];
}

export function useAvailabilityGridQuery(params: AvailabilityGridParams | null) {
  return useQuery({
    queryKey: params ? availabilityKey(params) : ["availability-grid", "idle"],
    queryFn: () => fetchAvailabilityGrid(params as AvailabilityGridParams),
    enabled: Boolean(params?.semesterId),
    staleTime: GRID_STALE,
    gcTime: GRID_GC,
    placeholderData: (prev) => prev,
  });
}
