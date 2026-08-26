import {
  BarChart3,
  CalendarCheck,
  ClipboardList,
  DoorOpen,
  ExternalLink,
  LayoutDashboard,
  PieChart,
  StickyNote,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { CLASSROOM_TYPE_LABELS } from "../../../lib/constants";
import { useStatsQuery } from "../../../lib/queries/dashboard";
import { Badge } from "../../ui/Badge";
import { EmptyBlock } from "../../ui/States";
import { useNavManager } from "../../system/NavManager";
import { MaintenanceList } from "../aulas/MaintenanceList";
import { AnnotationsList } from "../reservas/AnnotationsList";
import { ReservationsPanel } from "../reservas/ReservationsPanel";
import type { ModuleProps } from "../../system/moduleTypes";

interface KpiDef {
  label: string;
  value: number | undefined;
  suffix?: string;
  icon: LucideIcon;
  accent: string;
  target: string;
  hint: string;
}

const QUICK_LINKS = [
  { id: "tabla-semanal", label: "Tabla semanal" },
  { id: "semestres", label: "Semestres" },
  { id: "catalogos", label: "Catálogos" },
];

type ReportTab = "ocupacion" | "mantenimientos" | "reservas" | "anotaciones";

const REPORT_TABS: { id: ReportTab; label: string; icon: LucideIcon }[] = [
  { id: "ocupacion", label: "Ocupación", icon: PieChart },
  { id: "mantenimientos", label: "Mantenimientos", icon: Wrench },
  { id: "reservas", label: "Reservas", icon: ClipboardList },
  { id: "anotaciones", label: "Anotaciones", icon: StickyNote },
];

export default function DashboardAdmin(_props: ModuleProps) {
  const nm = useNavManager();
  const stats = useStatsQuery();

  const pendingCount =
    stats.data?.reservationsByStatus.find((r) => r.status === "PENDIENTE")?.count ?? 0;
  const confirmedCount =
    stats.data?.reservationsByStatus.find((r) => r.status === "CONFIRMADA")?.count ?? 0;

  const occupancyRows = stats.data?.occupancyByClassroom ?? [];
  const avgOccupancy =
    occupancyRows.length > 0
      ? Math.round(
          (occupancyRows.reduce((acc, row) => acc + row.percentage, 0) / occupancyRows.length) * 10,
        ) / 10
      : undefined;

  const kpis: KpiDef[] = [
    {
      label: "Aulas registradas",
      value: stats.data?.totalClassrooms,
      icon: DoorOpen,
      accent: "bg-sky-100 text-sky-700",
      target: "aulas",
      hint: "Abrir gestión de aulas",
    },
    {
      label: "Reservas activas",
      value: stats.data ? pendingCount + confirmedCount : undefined,
      icon: CalendarCheck,
      accent: "bg-emerald-100 text-emerald-700",
      target: "reservas",
      hint: "Abrir reservas",
    },
    {
      label: "Mantenimientos en curso",
      value: stats.data?.pendingMaintenance,
      icon: Wrench,
      accent: "bg-amber-100 text-amber-700",
      target: "aulas",
      hint: "Abrir módulo de aulas y mantenimientos",
    },
    {
      label: "Ocupación promedio",
      value: avgOccupancy,
      suffix: "%",
      icon: PieChart,
      accent: "bg-violet-100 text-violet-700",
      target: "reportes",
      hint: "Ver sección de reportes",
    },
  ];

  return (
    <div className="scroll-thin h-full overflow-y-auto p-4">
      <div className="mb-3 flex items-center gap-2">
        <LayoutDashboard size={18} className="text-sky-700" />
        <h2 className="text-sm font-bold tracking-wide text-slate-700 uppercase">
          Panel de administración
        </h2>
      </div>

      {!stats.data && stats.isLoading && <p className="py-8 text-center text-xs text-slate-400">Cargando indicadores…</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <button
              key={kpi.label}
              type="button"
              onClick={() => {
                if (kpi.target === "reportes") {
                  document.getElementById("reports-section")?.scrollIntoView({ behavior: "smooth" });
                } else {
                  nm.openModule(kpi.target);
                }
              }}
              title={kpi.hint}
              className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md"
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${kpi.accent}`}>
                <Icon size={18} />
              </span>
              <span className="text-2xl leading-none font-bold text-slate-800 tabular-nums">
                {kpi.value === undefined ? "—" : kpi.value}
                {kpi.value !== undefined && kpi.suffix ? kpi.suffix : ""}
              </span>
              <span className="text-[11px] leading-tight font-semibold text-slate-500">
                {kpi.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {QUICK_LINKS.map((quick) => (
          <button
            key={quick.id}
            type="button"
            onClick={() => nm.openModule(quick.id)}
            className="btn btn-secondary btn-sm"
          >
            {quick.label} <ExternalLink size={12} />
          </button>
        ))}
      </div>

      <OccupancySection />

      <ReportsSection />
    </div>
  );
}

function OccupancySection() {
  const nm = useNavManager();
  const stats = useStatsQuery();
  const rows = [...(stats.data?.occupancyByClassroom ?? [])].sort(
    (a, b) => b.percentage - a.percentage,
  );

  if (rows.length === 0) {
    return <EmptyBlock message="Sin datos de ocupación para el semestre activo." />;
  }

  return (
    <section className="mt-5">
      <h3 className="mb-2 text-[11px] font-bold tracking-widest text-slate-500 uppercase">
        Ocupación del semestre activo
      </h3>
      <div className="space-y-2">
        {rows.map((row) => (
          <button
            key={row.classroom.id}
            type="button"
            onClick={() => nm.openModule("tabla-semanal", { classroomId: row.classroom.id })}
            className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left transition-colors hover:border-sky-300 hover:bg-sky-50/50"
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
          </button>
        ))}
      </div>
    </section>
  );
}

function ReportsSection() {
  const [tab, setTab] = useState<ReportTab>("ocupacion");

  return (
    <section id="reports-section" className="mt-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-[11px] font-bold tracking-widest text-slate-500 uppercase">
          <BarChart3 size={13} /> Consultas y reportes
        </h3>
        <div className="flex flex-wrap gap-1">
          {REPORT_TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  tab === t.id
                    ? "bg-sky-100 text-sky-700"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <Icon size={11} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {tab === "ocupacion" && <OccupationReportTab />}
        {tab === "mantenimientos" && <MaintenanceList pageSize={10} />}
        {tab === "reservas" && (
          <div className="h-96">
            <ReservationsPanel />
          </div>
        )}
        {tab === "anotaciones" && <AnnotationsList />}
      </div>
    </section>
  );
}

function OccupationReportTab() {
  const stats = useStatsQuery();

  if (!stats.data) {
    return stats.isLoading ? (
      <EmptyBlock message="Cargando estadísticas…" icon={BarChart3} />
    ) : (
      <EmptyBlock message="Sin datos disponibles." icon={BarChart3} />
    );
  }

  const byType = [...(stats.data.classroomsByType ?? [])].sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Semestre activo</p>
          <p className="mt-1 text-sm font-bold text-slate-800">{stats.data.activeSemester?.name ?? "—"}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
          <p className="mb-1.5 text-[10px] font-bold tracking-widest text-slate-400 uppercase">Aulas por tipo</p>
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
    </div>
  );
}
