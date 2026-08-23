import {
  CalendarCheck,
  DoorOpen,
  ExternalLink,
  LayoutDashboard,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useStatsQuery } from "../../../lib/queries/dashboard";
import { useUsersQuery } from "../../../lib/queries/users";
import { EmptyBlock } from "../../ui/States";
import { useWindowManager } from "../../system/WindowManager";
import type { ModuleProps } from "../../system/moduleTypes";

interface KpiDef {
  label: string;
  value: number | undefined;
  icon: LucideIcon;
  accent: string;
  target: string;
  hint: string;
}

const QUICK_LINKS = [
  { id: "tabla-semanal", label: "Tabla semanal" },
  { id: "semestres", label: "Semestres" },
  { id: "planilla", label: "Planilla de horarios" },
  { id: "reportes", label: "Consultas y reportes" },
];

export default function DashboardAdmin(_props: ModuleProps) {
  const wm = useWindowManager();
  const stats = useStatsQuery();
  const usersQuery = useUsersQuery({ page: 1, pageSize: 1 });

  const pendingCount =
    stats.data?.reservationsByStatus.find((r) => r.status === "PENDIENTE")?.count ?? 0;
  const confirmedCount =
    stats.data?.reservationsByStatus.find((r) => r.status === "CONFIRMADA")?.count ?? 0;

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
      target: "supervision-reservas",
      hint: "Abrir supervisión de reservas",
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
      label: "Usuarios registrados",
      value: usersQuery.data?.meta.total,
      icon: Users,
      accent: "bg-violet-100 text-violet-700",
      target: "usuarios",
      hint: "Abrir gestión de usuarios",
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
              onClick={() => wm.openWindow(kpi.target)}
              title={kpi.hint}
              className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md"
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${kpi.accent}`}>
                <Icon size={18} />
              </span>
              <span className="text-2xl leading-none font-bold text-slate-800 tabular-nums">
                {kpi.value === undefined ? "—" : kpi.value}
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
            onClick={() => wm.openWindow(quick.id)}
            className="btn btn-secondary btn-sm"
          >
            {quick.label} <ExternalLink size={12} />
          </button>
        ))}
      </div>

      <OccupancySection />
    </div>
  );
}

function OccupancySection() {
  const wm = useWindowManager();
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
            onClick={() => wm.openWindow("planilla", { classroomId: row.classroom.id })}
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
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-sky-500 to-sky-600"
                style={{ width: `${Math.min(row.percentage, 100)}%` }}
              />
            </span>
            <span className="w-14 shrink-0 text-right text-xs font-bold text-slate-700 tabular-nums">
              {row.percentage.toFixed(1)}%
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
