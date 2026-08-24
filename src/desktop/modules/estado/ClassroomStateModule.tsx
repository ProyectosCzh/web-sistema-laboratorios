import {
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  ScanSearch,
  Table2,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AVAILABILITY_STATE_META, DAY_NAMES } from "../../../lib/constants";
import { fmtDate, todayISO } from "../../../lib/format";
import {
  useClassroomListForPick,
  useClassroomStateQuery,
} from "../../../lib/queries/classrooms";
import { useTimeSlotsQuery } from "../../../lib/queries/timeSlots";
import type { ClassroomStateResult } from "../../../lib/types";
import { useCurrentTimeSlot } from "../../shared/useCurrentTimeSlot";
import { useAuth } from "../../system/AuthContext";
import { useWindowManager } from "../../system/WindowManager";
import { Badge } from "../../ui/Badge";
import { Field, SelectInput, TextInput } from "../../ui/Field";
import { EmptyBlock, LoadingBlock } from "../../ui/States";

export default function ClassroomStateModule({
  params,
}: {
  params: Record<string, unknown>;
}) {
  const wm = useWindowManager();
  const { user } = useAuth();

  const paramClassroomId = typeof params.classroomId === "string" ? params.classroomId : "";
  const classrooms = useClassroomListForPick(true);
  const slotsQuery = useTimeSlotsQuery(true);
  const slots = useMemo(
    () => [...(slotsQuery.data ?? [])].sort((a, b) => a.order - b.order),
    [slotsQuery.data],
  );
  const currentSlot = useCurrentTimeSlot(slots);
  const outOfHours = (slotsQuery.data?.length ?? 0) > 0 && !currentSlot;

  const [classroomId, setClassroomId] = useState(paramClassroomId);
  const [date, setDate] = useState(todayISO());
  const [timeSlotId, setTimeSlotId] = useState("");

  useEffect(() => {
    if (!timeSlotId && currentSlot) setTimeSlotId(currentSlot.id);
  }, [currentSlot, timeSlotId]);

  useEffect(() => {
    if (!classroomId) {
      const first = (classrooms.data?.data ?? []).find((c) => c.status === "ACTIVA");
      if (first) setClassroomId(first.id);
    }
  }, [classrooms.data, classroomId]);

  const ready = Boolean(classroomId && timeSlotId);
  const stateQuery = useClassroomStateQuery(
    ready ? classroomId : null,
    ready ? { date, timeSlotId } : {},
  );
  const result: ClassroomStateResult | undefined = ready ? stateQuery.data : undefined;
  const meta = result ? AVAILABILITY_STATE_META[result.state] : null;

  const options = (classrooms.data?.data ?? [])
    .filter((c) => c.status !== "INACTIVA")
    .map((c) => ({ value: c.id, label: `${c.code} · ${c.name}` }));

  return (
    <div className="scroll-thin flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-bold tracking-wide text-slate-700 uppercase">
          <ScanSearch size={16} className="text-sky-700" /> Estado del aula en tiempo real
        </h2>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Consulta el estado puntual de un aula para un día y bloque determinado.
        </p>
      </div>

      <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3">
        <Field label="Aula" required>
          <SelectInput
            options={options}
            placeholder="Seleccione aula…"
            value={classroomId}
            onChange={(e) => setClassroomId(e.target.value)}
          />
        </Field>
        <Field label="Fecha" required>
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field
          label="Bloque horario"
          required
          hint={
            currentSlot
              ? `Bloque actual: ${currentSlot.label}`
              : "Fuera del horario de clases. Seleccione un bloque manualmente."
          }
        >
          <SelectInput
            options={slots.map((s) => ({
              value: s.id,
              label: `${s.label} (${s.startTime.slice(0, 5)}–${s.endTime.slice(0, 5)})`,
            }))}
            placeholder="Seleccione bloque…"
            value={timeSlotId}
            onChange={(e) => setTimeSlotId(e.target.value)}
          />
        </Field>
      </section>

      {outOfHours && (
        <p className="flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          <CalendarClock size={12} /> Fuera del horario de clases: no hay ningún bloque activo en
          este momento. Seleccione un bloque manualmente para consultar su estado.
        </p>
      )}

      {!ready ? (
        <EmptyBlock message="Complete aula, fecha y bloque para consultar el estado." icon={ScanSearch} />
      ) : stateQuery.isLoading && !stateQuery.data ? (
        <LoadingBlock label="Consultando estado…" />
      ) : stateQuery.error && !stateQuery.data ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          No se pudo consultar el estado. Verifique que el bloque pertenezca al turno oficial e
          intente nuevamente.
        </p>
      ) : result && meta ? (
        <section className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <span
            className={`flex h-20 w-20 items-center justify-center rounded-full ${
              result.state === "LIBRE"
                ? "bg-emerald-100 text-emerald-600"
                : result.state === "OCUPADA"
                  ? "bg-rose-100 text-rose-600"
                  : "bg-slate-200 text-slate-500"
            }`}
          >
            {result.state === "LIBRE" ? (
              <CheckCircle2 size={40} />
            ) : result.state === "OCUPADA" ? (
              <CircleAlert size={40} />
            ) : (
              <Wrench size={38} />
            )}
          </span>
          <div className="text-center">
            <p className="text-xl font-bold text-slate-800">{meta.label}</p>
            <p className="text-xs text-slate-500">{meta.description}</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs text-slate-600">
            <Badge tone="info">{result.classroom.code}</Badge>
            <Badge tone="neutral">
              <CalendarClock size={11} /> {fmtDate(result.date)}
            </Badge>
            <Badge tone="neutral">{DAY_NAMES[result.dayOfWeek] ?? "Fuera de días hábiles"}</Badge>
          </div>

          {result.reason && (
            <p className="max-w-md rounded-md bg-slate-50 px-3 py-1.5 text-center text-[11px] text-slate-500">
              {result.reason}
            </p>
          )}

          {result.state === "OCUPADA" && result.occupiedBy && (
            <div className="w-full max-w-md rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-700">
              {result.occupiedBy.kind === "SCHEDULE" ? (
                <>
                  <strong>Bloque de planilla:</strong> {result.occupiedBy.schedule.subject.name}
                  {result.occupiedBy.schedule.teacher
                    ? ` · ${result.occupiedBy.schedule.teacher.name}`
                    : ""}
                </>
              ) : (
                <>
                  <strong>Reserva</strong>{" "}
                  {result.occupiedBy.reservation.type === "PUNTUAL" ? "puntual" : "semanal"} ·{" "}
                  {result.occupiedBy.reservation.status.toLowerCase()}
                  {result.occupiedBy.reservation.note
                    ? ` · ${result.occupiedBy.reservation.note}`
                    : ""}
                </>
              )}
            </div>
          )}

          {result.state === "LIBRE" &&
            (user.role === "AYUDANTE" ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() =>
                  wm.openWindow("nueva-reserva", {
                    classroomId: result.classroomId,
                    date,
                    timeSlotId,
                    dayOfWeek: result.dayOfWeek,
                  })
                }
              >
                Reservar ahora
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => wm.openWindow("planilla", { classroomId: result.classroomId })}
              >
                Asignar bloque de planilla
              </button>
            ))}

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => wm.openWindow("tabla-semanal", { classroomId: result.classroomId })}
          >
            <Table2 size={13} /> Ver tabla semanal completa
          </button>
        </section>
      ) : null}
    </div>
  );
}
