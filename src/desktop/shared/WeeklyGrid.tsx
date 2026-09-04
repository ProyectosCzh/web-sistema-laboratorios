import { DAY_SHORT } from "../../lib/constants";
import { fmtDate, slotRange } from "../../lib/format";
import type {
  AvailabilityGridCell,
  AvailabilityGridClassroom,
  Schedule,
  TimeSlot,
} from "../../lib/types";
import type { ReactNode } from "react";

export interface GridEntryVM {
  kind: "SCHEDULE" | "RESERVATION" | "BLOCKED";
  tone: "schedule" | "pending" | "confirmed" | "blocked";
  title: string;
  subtitle?: string;
  raw?: unknown;
}

export function cellKey(dayOfWeek: number, slotId: string): string {
  return `${dayOfWeek}|${slotId}`;
}

export function parseCellKey(key: string): { day: number; slotId: string } {
  const [day, slotId] = key.split("|");
  return { day: Number(day), slotId };
}

export function vmFromSchedule(schedule: Schedule): GridEntryVM {
  return {
    kind: "SCHEDULE",
    tone: "schedule",
    title: schedule.subject.name,
    subtitle: schedule.teacher?.name ?? "Sin docente",
    raw: schedule,
  };
}

type GridEntry = NonNullable<AvailabilityGridCell["entry"]>;

export function vmFromGridEntry(entry: GridEntry): GridEntryVM {
  if (entry.kind === "SCHEDULE") {
    return {
      kind: "SCHEDULE",
      tone: "schedule",
      title: entry.subject.name,
      subtitle: entry.teacher?.name ?? "Sin docente",
      raw: entry,
    };
  }
  return {
    kind: "RESERVATION",
    tone:
      entry.status === "PENDIENTE"
        ? "pending"
        : entry.status === "CONFIRMADA"
          ? "confirmed"
          : "blocked",
    title: entry.type === "PUNTUAL" ? "Reserva puntual" : "Reserva semanal",
    subtitle: entry.type === "PUNTUAL" && entry.date ? fmtDate(entry.date) : undefined,
    raw: entry,
  };
}

export function buildEntriesFromClassroom(
  gc: AvailabilityGridClassroom,
): Record<string, GridEntryVM> {
  const map: Record<string, GridEntryVM> = {};
  const coords: string[] = [];
  for (const cell of gc.cells) {
    const key = cellKey(cell.dayOfWeek, cell.timeSlotId);
    coords.push(key);
    if (!cell.entry) continue;
    map[key] = vmFromGridEntry(cell.entry);
  }
  if (gc.maintenance.some((m) => m.status !== "COMPLETADO")) {
    for (const key of coords) {
      if (!map[key]) {
        map[key] = {
          kind: "BLOCKED",
          tone: "blocked",
          title: "Mantenimiento",
          subtitle: gc.maintenance.find((m) => m.status !== "COMPLETADO")?.reason,
        };
      }
    }
  }
  return map;
}

const TONE_CHIP_CLASSES: Record<GridEntryVM["tone"], string> = {
  schedule: "chip-schedule",
  pending: "chip-reservation-pending",
  confirmed: "chip-reservation-confirmed",
  blocked: "rounded bg-slate-500/95 px-1.5 py-1 text-white shadow-sm",
};

const TONE_CHIP_CLASSES_COMPACT: Record<GridEntryVM["tone"], string> = {
  schedule: "rounded bg-sky-600/95 px-1 py-0.5 text-white shadow-sm",
  pending: "rounded bg-amber-500/95 px-1 py-0.5 text-white shadow-sm",
  confirmed: "rounded bg-rose-600/95 px-1 py-0.5 text-white shadow-sm",
  blocked: "rounded-sm bg-slate-500/95 px-1 py-0.5 text-white shadow-sm",
};

const LEGEND_ITEMS = [
  { label: "Disponible", cls: "bg-emerald-200 border border-emerald-400" },
  { label: "Clase / planilla", cls: "bg-sky-600" },
  { label: "Reserva pendiente", cls: "bg-amber-500" },
  { label: "Reserva confirmada", cls: "bg-rose-600" },
  { label: "Mantenimiento", cls: "bg-slate-400" },
];

export function GridLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-600">
      {LEGEND_ITEMS.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span className={`h-3 w-3 rounded-sm ${item.cls}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

interface WeeklyGridProps {
  workingDays: number[];
  timeSlots: TimeSlot[];
  entries: Record<string, GridEntryVM>;
  onCellClick?: (key: string, entry: GridEntryVM | null) => void;
  banner?: ReactNode;
  legend?: boolean;
  compact?: boolean;
  className?: string;
}

export function WeeklyGrid({
  workingDays,
  timeSlots,
  entries,
  onCellClick,
  banner,
  legend = true,
  compact = false,
  className,
}: WeeklyGridProps) {
  const days = [...workingDays].sort((a, b) => a - b);
  const slots = [...timeSlots].sort((a, b) => a.order - b.order);

  const toneClasses = compact ? TONE_CHIP_CLASSES_COMPACT : TONE_CHIP_CLASSES;
  const tableSpacing = compact ? "border-spacing-0.5" : "border-spacing-1";
  const headerThClsCompact = "sticky left-0 z-[2] w-14 min-w-14 bg-white p-0"; // 56px
  const headerThClsNormal = "sticky left-0 z-[2] w-[68px] min-w-[68px] bg-white p-0";
  const headerBlockCls = compact
    ? "rounded-sm bg-slate-100 px-1.5 py-1 text-center text-[10px] font-bold tracking-wide text-slate-500 uppercase"
    : "rounded-md bg-slate-100 px-2 py-2 text-center text-[10px] font-bold tracking-wide text-slate-500 uppercase";
  const headerDayCls = compact
    ? "rounded-sm bg-slate-100 px-1.5 py-1 text-[10px] font-bold tracking-wide text-slate-600 uppercase"
    : "rounded-md bg-slate-100 px-2 py-2 text-[11px] font-bold tracking-wide text-slate-600 uppercase";
  const slotCellCls = compact
    ? "flex flex-col items-center justify-center rounded-sm bg-slate-800 px-1 py-1 text-white text-center"
    : "flex flex-col items-center justify-center rounded-md bg-slate-800 px-1.5 py-1.5 text-white text-center";
  const cellHeightCls = compact ? "h-11 p-0 align-top" : "h-16 p-0 align-top";
  const gridCellExtra = compact ? "grid-cell-compact" : "";
  const outerTextSize = compact ? "text-[11px]" : "text-xs";

  return (
    <div className={`flex min-h-0 flex-col gap-2 ${className ?? ""}`}>
      {banner}
      <div className="scroll-thin overflow-auto pb-1">
        <table className={`w-full border-separate ${tableSpacing} ${outerTextSize}`}>
          <thead>
            <tr>
              <th className={compact ? headerThClsCompact : headerThClsNormal}>
                <div className={headerBlockCls}>Bloque</div>
              </th>
              {days.map((day) => (
                <th key={day} className="p-0">
                  <div className={headerDayCls}>{DAY_SHORT[day] ?? `D${day}`}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => (
              <tr key={slot.id}>
                <td className="sticky left-0 z-[1] bg-white p-0 align-middle">
                  <div className={slotCellCls} title={`${slot.label} ${slotRange(slot)}`}>
                    <span
                      className={
                        compact
                          ? "text-[9px] font-semibold tabular-nums leading-none"
                          : "text-[11px] font-semibold tabular-nums leading-none"
                      }
                    >
                      {slotRange(slot)}
                    </span>
                  </div>
                </td>
                {days.map((day) => {
                  const key = cellKey(day, slot.id);
                  const entry = entries[key] ?? null;
                  const clickable = Boolean(onCellClick);
                  const freeCls = clickable
                    ? "grid-cell-free"
                    : "cursor-default border-emerald-200 bg-emerald-50 text-emerald-700";
                  return (
                    <td key={key} className={cellHeightCls}>
                      <button
                        type="button"
                        disabled={!clickable}
                        onClick={() => onCellClick?.(key, entry)}
                        className={`grid-cell h-full w-full ${gridCellExtra} ${
                          entry ? "cursor-pointer border-slate-200 bg-slate-50 hover:border-sky-400" : freeCls
                        }`}
                        title={
                          entry ? `${entry.title}${entry.subtitle ? ` · ${entry.subtitle}` : ""}` : "Disponible"
                        }
                      >
                        {entry ? (
                          <span className={`w-full ${toneClasses[entry.tone]}`}>
                            <span className="block truncate font-bold">{entry.title}</span>
                            {entry.subtitle && (
                              <span className="block truncate opacity-90">{entry.subtitle}</span>
                            )}
                          </span>
                        ) : (
                          <span className="font-semibold">Disponible</span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {legend && <GridLegend />}
    </div>
  );
}
