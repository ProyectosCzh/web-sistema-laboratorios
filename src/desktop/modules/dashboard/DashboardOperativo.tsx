import {
  CalendarClock,
  CalendarPlus,
  ScanSearch,
  Table2,
  Wrench,
} from "lucide-react";
import { DAY_NAMES } from "../../../lib/constants";
import { fmtDate, todayISO, weekdayOfISO } from "../../../lib/format";
import { useAvailabilityGridQuery } from "../../../lib/queries/dashboard";
import { useReservationsQuery } from "../../../lib/queries/reservations";
import { useActiveSemester } from "../../../lib/queries/semesters";
import type { AvailabilityGridClassroom, Reservation } from "../../../lib/types";
import { useCurrentTimeSlot } from "../../shared/useCurrentTimeSlot";
import { useWindowManager } from "../../system/WindowManager";
import { Badge } from "../../ui/Badge";
import { EmptyBlock, LoadingBlock } from "../../ui/States";
import type { ModuleProps } from "../../system/moduleTypes";

const QUICK_ACTIONS = [
  { id: "nueva-reserva", label: "Registrar reserva", icon: CalendarPlus },
  { id: "tabla-semanal", label: "Tabla semanal", icon: Table2 },
  { id: "reservas", label: "Mis reservas", icon: CalendarClock },
];

export default function DashboardOperativo(_props: ModuleProps) {
  const wm = useWindowManager();
  const semester = useActiveSemester();
  const grid = useAvailabilityGridQuery(
    semester ? { semesterId: semester.id, includePuntual: true } : null,
  );
  const myReservations = useReservationsQuery({ page: 1, pageSize: 30 });

  const timeSlots = grid.data?.timeSlots ?? [];
  const currentSlot = useCurrentTimeSlot(timeSlots);

  const today = todayISO();
  const dow = weekdayOfISO(today);
  const isWorkingDay = semester?.workingDays.includes(dow) ?? false;
  const outOfHours = !isWorkingDay || !currentSlot;

  const freeNow = computeFreeNow(
    grid.data?.classrooms ?? [],
    dow,
    isWorkingDay ? currentSlot?.id ?? null : null,
  );

  const upcoming = pickUpcoming(myReservations.data?.data ?? [], today);

  const openMaintenances =
    grid.data?.classrooms.flatMap((gc) =>
      gc.maintenance
        .filter((m) => m.status !== "COMPLETADO")
        .map((m) => ({ ...m, classroom: gc.classroom })),
    ) ?? [];

  return (
    <div className="scroll-thin h-full overflow-y-auto p-4">
      <div className="mb-1 text-sm font-bold tracking-wide text-slate-700 uppercase">
        Panel operativo
      </div>
      <p className="mb-4 text-xs text-slate-500">
        {isWorkingDay
          ? `Hoy es ${DAY_NAMES[dow] ?? "—"} · semestre ${semester?.name ?? "—"}${
              currentSlot ? ` · bloque ${currentSlot.label}` : " · fuera del horario de clases"
            }`
          : `Hoy (${fmtDate(today)}) no es un día hábil del semestre activo.`}
      </p>

      <div className="grid gap-3 lg:grid-cols-2">
        <FreeNowCard
          loading={!grid.data && grid.isLoading}
          items={freeNow}
          outOfHours={outOfHours}
          onSelect={(id) => wm.openWindow("tabla-semanal", { classroomId: id })}
        />

        <section className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <header className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-[11px] font-bold tracking-widest text-slate-500 uppercase">
              <CalendarClock size={13} /> Próximas reservas
            </h3>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => wm.openWindow("reservas")}
            >
              Ver todas
            </button>
          </header>
          {upcoming.length === 0 ? (
            <EmptyBlock message="No tienes reservas activas." />
          ) : (
            <ul className="space-y-1.5">
              {upcoming.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5"
                >
                  <Badge tone={r.status === "PENDIENTE" ? "warning" : "info"}>
                    {r.classroom.code}
                  </Badge>
                  <span className="min-w-0 flex-1 truncate text-xs text-slate-600">
                    {r.type === "PUNTUAL" && r.date
                      ? `${fmtDate(r.date)} · `
                      : r.dayOfWeek
                        ? `${DAY_NAMES[r.dayOfWeek] ?? ""} · `
                        : ""}
                    {r.timeSlot.label}
                    {r.note ? ` · ${r.note}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm lg:col-span-2">
          <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold tracking-widest text-slate-500 uppercase">
            <Wrench size={13} /> Mantenimientos activos
          </h3>
          {openMaintenances.length === 0 ? (
            <p className="py-2 text-xs text-slate-400">
              Sin mantenimientos en curso. Todo funciona con normalidad.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {openMaintenances.map((m) => (
                <li
                  key={m.id}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800"
                >
                  <span className="font-mono font-bold">{m.classroom.code}</span> ·{" "}
                  {fmtDate(m.date)} · {m.reason}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {QUICK_ACTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => wm.openWindow(id)}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function FreeNowCard({
  loading,
  items,
  outOfHours,
  onSelect,
}: {
  loading: boolean;
  items: { id: string; code: string; name: string }[];
  outOfHours: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold tracking-widest text-slate-500 uppercase">
        <Table2 size={13} /> Aulas libres ahora
      </h3>
      {loading ? (
        <LoadingBlock label="Consultando disponibilidad…" />
      ) : items.length === 0 ? (
        <EmptyBlock
          message={
            outOfHours
              ? "Fuera del horario de clases."
              : "No hay aulas libres en este momento."
          }
        />
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id)}
              title={`${c.name} — ver estado`}
              className="group flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 transition-colors hover:border-emerald-400 hover:bg-emerald-100"
            >
              <span className="font-mono text-xs font-bold text-emerald-700">{c.code}</span>
              <ScanSearch
                size={12}
                className="text-emerald-600 opacity-60 group-hover:opacity-100"
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function computeFreeNow(
  classrooms: AvailabilityGridClassroom[],
  dayOfWeek: number,
  currentSlotId: string | null,
): { id: string; code: string; name: string }[] {
  if (dayOfWeek < 1 || !currentSlotId) return [];
  const results: { id: string; code: string; name: string }[] = [];

  for (const gc of classrooms) {
    if (gc.maintenance.some((m) => m.status !== "COMPLETADO")) continue;

    const busy = gc.cells.some(
      (cell) =>
        cell.dayOfWeek === dayOfWeek &&
        cell.timeSlotId === currentSlotId &&
        cell.entry !== null,
    );
    if (!busy) {
      results.push(gc.classroom);
    }
  }
  return results;
}

function pickUpcoming(reservations: Reservation[], today: string): Reservation[] {
  const score = (r: Reservation): number => {
    if (r.type === "PUNTUAL" && r.date) {
      return r.date >= today ? 0 : 2;
    }
    if (r.dayOfWeek) {
      const diff = ((r.dayOfWeek - weekdayOfISO(today)) % 7 + 7) % 7;
      return diff === 0 ? 0 : 1;
    }
    return 3;
  };
  return reservations
    .filter((r) => r.status === "PENDIENTE" || r.status === "CONFIRMADA")
    .sort((a, b) => score(a) - score(b))
    .slice(0, 5);
}
