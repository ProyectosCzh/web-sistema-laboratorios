import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { api, apiErrorToMessage } from "../lib/api";
import { useAuth } from "../lib/auth";
import { MAINTENANCE_STATUS_COLORS, MAINTENANCE_STATUS_LABELS } from "../lib/constants";
import { isEncargado } from "../lib/permissions";
import type { Classroom, MaintenanceLog, MaintenanceStatus } from "../lib/types";

const STATUSES: MaintenanceStatus[] = ["REPORTADO", "EN_PROGRESO", "COMPLETADO"];

export default function MaintenancePanel() {
  const { user } = useAuth();
  const isAdmin = isEncargado(user);
  const queryClient = useQueryClient();

  const [classroomFilter, setClassroomFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | MaintenanceStatus>("");
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ classroomId: "", date: today(), reason: "" });

  const classroomsQuery = useQuery({
    queryKey: ["classrooms"],
    queryFn: async () => (await api.get<{ classrooms: Classroom[] }>("/classrooms")).data.classrooms,
  });

  const maintenanceQuery = useQuery({
    queryKey: ["maintenance"],
    queryFn: async () =>
      (await api.get<{ maintenance: MaintenanceLog[] }>("/maintenance")).data.maintenance,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["maintenance"] });
    queryClient.invalidateQueries({ queryKey: ["stats"] });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post("/maintenance", {
        classroomId: form.classroomId,
        date: form.date,
        reason: form.reason.trim(),
      });
    },
    onSuccess: () => {
      setForm({ classroomId: "", date: today(), reason: "" });
      invalidate();
    },
    onError: (err) => setError(apiErrorToMessage(err)),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: MaintenanceStatus }) => {
      await api.patch(`/maintenance/${id}`, { status });
    },
    onSuccess: invalidate,
    onError: (err) => setError(apiErrorToMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/maintenance/${id}`);
    },
    onSuccess: invalidate,
    onError: (err) => setError(apiErrorToMessage(err)),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.classroomId || !form.date || form.reason.trim().length < 3) {
      setError("Completá aula y fecha, y un motivo de al menos 3 caracteres");
      return;
    }
    createMutation.mutate();
  };

  const classrooms = classroomsQuery.data ?? [];
  const reports = (maintenanceQuery.data ?? [])
    .filter((m) => (classroomFilter ? m.classroomId === classroomFilter : true))
    .filter((m) => (statusFilter ? m.status === statusFilter : true));

  const inputClass =
    "w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";
  const labelClass = "mb-1 block text-sm font-medium text-gray-700";

  if (classroomsQuery.isLoading || maintenanceQuery.isLoading) {
    return <p className="text-sm text-gray-500">Cargando reportes...</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Nuevo reporte de mantenimiento</h2>
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Aula</label>
              <select
                value={form.classroomId}
                onChange={(e) => setForm({ ...form, classroomId: e.target.value })}
                className={inputClass}
              >
                <option value="">Seleccioná un aula</option>
                {classrooms
                  .filter((c) => c.active)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Fecha</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Motivo</label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className={inputClass}
                rows={3}
                maxLength={500}
              />
            </div>
            {error && (
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {createMutation.isPending ? "Guardando..." : "Registrar reporte"}
            </button>
          </div>
        </form>
      </div>

      <div className="lg:col-span-2">
        <div className="mb-3 flex flex-wrap gap-3">
          <select
            value={classroomFilter}
            onChange={(e) => setClassroomFilter(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">Todas las aulas</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} - {c.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "" | MaintenanceStatus)}
            className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">Todos los estados</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {MAINTENANCE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        {reports.length === 0 ? (
          <p className="text-sm text-gray-500">Sin reportes para los filtros seleccionados.</p>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <div key={report.id} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {report.classroom.code} - {report.classroom.name}
                    </p>
                    <p className="text-sm text-gray-700">{report.reason}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {new Date(report.date).toLocaleDateString("es-AR")} · Reportado el{" "}
                      {new Date(report.createdAt).toLocaleString("es-AR")}
                    </p>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${MAINTENANCE_STATUS_COLORS[report.status]}`}
                  >
                    {MAINTENANCE_STATUS_LABELS[report.status]}
                  </span>
                </div>

                {isAdmin && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <select
                      value={report.status}
                      onChange={(e) =>
                        statusMutation.mutate({
                          id: report.id,
                          status: e.target.value as MaintenanceStatus,
                        })
                      }
                      disabled={statusMutation.isPending}
                      className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {MAINTENANCE_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => deleteMutation.mutate(report.id)}
                      disabled={deleteMutation.isPending}
                      className="rounded border border-red-300 px-2 py-1 text-sm text-red-700 hover:bg-red-50"
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
