import type { ModuleProps } from "../../system/moduleTypes";
import { BarChart3 } from "lucide-react";
import { useState } from "react";
import { CLASSROOM_TYPE_LABELS } from "../../../lib/constants";
import { useStatsQuery } from "../../../lib/queries/dashboard";
import { Badge } from "../../ui/Badge";
import { EmptyBlock } from "../../ui/States";
import { MaintenanceList } from "../aulas/MaintenanceList";
import { AnnotationsList } from "../anotaciones/AnnotationsModule";
import { ReservationsPanel } from "../reservas/ReservationsPanel";

type Tab = "ocupacion" | "mantenimientos" | "reservas" | "anotaciones";

const TABS: { id: Tab; label: string }[] = [
  { id: "ocupacion", label: "Ocupación" },
  { id: "mantenimientos", label: "Mantenimientos" },
  { id: "reservas", label: "Historial de reservas" },
  { id: "anotaciones", label: "Incidencias y anotaciones" },
];

export default function ReportsModule(_props: ModuleProps) {
  const [tab, setTab] = useState<Tab>("ocupacion");

  return (
    <div className="scroll-thin flex h-full min-h-0 flex-col gap-3 overflow-hidden p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold tracking-wide text-slate-700 uppercase">
          <BarChart3 size={16} className="text-sky-700" /> Consultas y reportes
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`btn btn-sm ${tab === t.id ? "btn-primary" : "btn-secondary"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        {tab === "ocupacion" && <OccupationTab />}
        {tab === "mantenimientos" && <MaintenanceList pageSize={10} />}
        {tab === "reservas" && (
          <div className="h-full">
            <ReservationsPanel />
          </div>
        )}
        {tab === "anotaciones" && <AnnotationsList />}
      </div>
    </div>
  );
}

function OccupationTab() {
  const stats = useStatsQuery();

  if (!stats.data) {
    return stats.isLoading ? (
      <EmptyBlock message="Cargando estadísticas…" icon={BarChart3} />
    ) : (
      <EmptyBlock message="Sin datos disponibles." icon={BarChart3} />
    );
  }

  const byType = [...(stats.data.classroomsByType ?? [])].sort((a, b) => b.count - a.count);
  const rows = [...(stats.data.occupancyByClassroom ?? [])].sort(
    (a, b) => b.percentage - a.percentage,
  );

  return (
    <div className="space-y-4 pb-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <p className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">Semestre activo</p>
          <p className="mt-1 text-lg font-bold text-slate-800">{stats.data.activeSemester?.name ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm sm:col-span-2">
          <p className="mb-1.5 text-[11px] font-bold tracking-widest text-slate-400 uppercase">Aulas por tipo</p>
          <div className="flex flex-wrap gap-1.5">
            {byType.length === 0 && <span className="text-xs text-slate-400">—</span>}
            {byType.map((t) => (
              <Badge key={t.type} tone="info">
                {CLASSROOM_TYPE_LABELS[t.type]}: {t.count}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <section>
        <h3 className="mb-2 text-[11px] font-bold tracking-widest text-slate-500 uppercase">
          Ocupación por aula (bloques de planilla sobre el semestre activo)
        </h3>
        {rows.length === 0 ? (
          <EmptyBlock message="Sin datos de ocupación." />
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <div
                key={row.classroom.id}
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <span className="w-16 shrink-0 font-mono text-xs font-bold text-slate-700">
                  {row.classroom.code}
                </span>
                <span className="hidden min-w-0 flex-1 truncate text-xs text-slate-500 sm:block">
                  {row.classroom.name}
                </span>
                <span className="relative h-2 min-w-24 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <span
                    className={`absolute inset-y-0 left-0 rounded-full ${
                      row.percentage > 66
                        ? "bg-rose-500"
                        : row.percentage > 33
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(row.percentage, 100)}%` }}
                  />
                </span>
                <span className="shrink-0 text-right text-[11px] whitespace-nowrap text-slate-500 tabular-nums">
                  {row.occupiedSlots}/{row.totalSlots} · {row.percentage.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
