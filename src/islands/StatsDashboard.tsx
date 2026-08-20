import { useQuery } from "@tanstack/react-query";
import { api, apiErrorToMessage } from "../lib/api";
import { CLASSROOM_TYPE_LABELS } from "../lib/constants";
import type { StatsOverview } from "../lib/types";

export default function StatsDashboard() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => (await api.get<StatsOverview>("/stats/overview")).data,
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-24 rounded-lg bg-gray-200" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p>{apiErrorToMessage(error)}</p>
        <button
          onClick={() => refetch()}
          className="mt-2 rounded border border-red-300 px-3 py-1 text-sm hover:bg-red-100"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const kpis = [
    { label: "Aulas", value: data.totalClassrooms },
    {
      label: "Semestre activo",
      value: data.activeSemester?.name ?? "Sin semestre",
    },
    { label: "Mantenimientos pendientes", value: data.pendingMaintenance },
    {
      label: "Ocupación promedio",
      value:
        data.occupancyByClassroom.length > 0
          ? `${(
              data.occupancyByClassroom.reduce((acc, o) => acc + o.percentage, 0) /
              data.occupancyByClassroom.length
            ).toFixed(1)}%`
          : "—",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">{kpi.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Aulas por tipo</h2>
          {data.classroomsByType.length === 0 ? (
            <p className="text-sm text-gray-500">Sin aulas cargadas</p>
          ) : (
            <ul className="space-y-2">
              {data.classroomsByType.map((item) => (
                <li key={item.type} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{CLASSROOM_TYPE_LABELS[item.type]}</span>
                  <span className="font-semibold text-gray-900">{item.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Ocupación por aula</h2>
          {data.occupancyByClassroom.length === 0 ? (
            <p className="text-sm text-gray-500">Sin aulas activas</p>
          ) : (
            <ul className="space-y-3">
              {data.occupancyByClassroom.map((o) => (
                <li key={o.classroom.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-gray-700">
                      {o.classroom.code} - {o.classroom.name}
                    </span>
                    <span className="text-gray-500">
                      {o.occupiedSlots}/{o.totalSlots} · {o.percentage}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded bg-gray-200">
                    <div
                      className="h-full rounded bg-blue-600"
                      style={{ width: `${Math.min(o.percentage, 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
