import { CalendarPlus, CheckCircle2, CircleAlert, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  AVAILABILITY_STATE_META,
  DAY_NAMES,
  RESERVATION_TYPE_LABELS,
} from "../../../lib/constants";
import { apiErrorToMessage } from "../../../lib/errors";
import { fmtDate, todayISO } from "../../../lib/format";
import { useClassroomListForPick, useClassroomStateQuery } from "../../../lib/queries/classrooms";
import { useReservationMutations } from "../../../lib/queries/reservations";
import { useActiveSemester } from "../../../lib/queries/semesters";
import { useTimeSlotsQuery } from "../../../lib/queries/timeSlots";
import type { ReservationType } from "../../../lib/types";
import { useCurrentTimeSlot } from "../../shared/useCurrentTimeSlot";
import { useToast } from "../../system/ToastProvider";
import { useWindowManager } from "../../system/WindowManager";
import { Badge } from "../../ui/Badge";
import { Field, SelectInput, TextArea } from "../../ui/Field";

export default function NewReservationModule({
  params,
}: {
  params: Record<string, unknown>;
}) {
  const toast = useToast();
  const wm = useWindowManager();

  const activeSemester = useActiveSemester();
  const classrooms = useClassroomListForPick(true);
  const slots = useTimeSlotsQuery(true);
  const currentSlot = useCurrentTimeSlot(slots.data);
  const { create } = useReservationMutations();

  const paramClassroomId = typeof params.classroomId === "string" ? params.classroomId : "";
  const paramDayOfWeek =
    typeof params.dayOfWeek === "number" && params.dayOfWeek >= 1 && params.dayOfWeek <= 6
      ? params.dayOfWeek
      : null;
  const paramDate = typeof params.date === "string" && params.date !== "" ? params.date : "";
  const paramSlotId = typeof params.timeSlotId === "string" ? params.timeSlotId : "";

  const [type, setType] = useState<ReservationType>("RECURRENTE");
  const [classroomId, setClassroomId] = useState(paramClassroomId);
  const [dayOfWeek, setDayOfWeek] = useState(String(paramDayOfWeek ?? ""));
  const [date, setDate] = useState(paramDayOfWeek ? "" : paramDate || todayISO());
  const [timeSlotId, setTimeSlotId] = useState(paramSlotId);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!timeSlotId && currentSlot) setTimeSlotId(currentSlot.id);
  }, [currentSlot, timeSlotId]);

  useEffect(() => {
    if (!classroomId) {
      const first = (classrooms.data?.data ?? []).find((c) => c.status === "ACTIVA");
      if (first) setClassroomId(first.id);
    }
  }, [classrooms.data, classroomId]);

  const readyToVerify = Boolean(
    classroomId &&
      timeSlotId &&
      activeSemester &&
      (type === "RECURRENTE"
        ? dayOfWeek !== ""
        : date !== "" && date >= todayISO()),
  );

  const verifyInput = useMemo(() => {
    if (!readyToVerify) return null;
    return type === "RECURRENTE"
      ? { dayOfWeek: Number(dayOfWeek), timeSlotId }
      : { date, timeSlotId };
  }, [readyToVerify, type, dayOfWeek, date, timeSlotId]);

  const stateQuery = useClassroomStateQuery(readyToVerify ? classroomId : null, verifyInput ?? {});
  const stateResult = readyToVerify && !stateQuery.isLoading ? stateQuery.data : undefined;
  const meta = stateResult ? AVAILABILITY_STATE_META[stateResult.state] : null;
  const isFree = stateResult?.state === "LIBRE";

  const submit = async () => {
    if (!activeSemester || !isFree || !verifyInput) return;
    try {
      await create.mutateAsync({
        classroomId,
        semesterId: activeSemester.id,
        type,
        timeSlotId,
        ...(type === "RECURRENTE"
          ? { dayOfWeek: Number(dayOfWeek) }
          : { date }),
        note: note.trim() === "" ? null : note.trim(),
      });
      toast.success("Reserva registrada. Queda PENDIENTE de confirmación.");
      setNote("");
    } catch (err) {
      toast.error(apiErrorToMessage(err));
    }
  };

  const options = (classrooms.data?.data ?? [])
    .filter((c) => c.status !== "INACTIVA")
    .map((c) => ({ value: c.id, label: `${c.code} · ${c.name}` }));

  return (
    <div className="scroll-thin flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-bold tracking-wide text-slate-700 uppercase">
          <CalendarPlus size={16} className="text-sky-700" /> Nueva reserva
        </h2>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Registre una reserva semanal o puntual. El sistema la dejará{" "}
          <Badge tone="warning">PENDIENTE</Badge> hasta que el Encargado la confirme.
        </p>
      </div>

      {!activeSemester ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          No hay semestre activo; no se pueden registrar reservas.
        </p>
      ) : (
        <section className="space-y-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <Field label="Tipo de reserva" required hint="El tipo no puede modificarse después de crearla.">
            <SelectInput
              options={(Object.keys(RESERVATION_TYPE_LABELS) as ReservationType[]).map((t) => ({
                value: t,
                label:
                  RESERVATION_TYPE_LABELS[t] +
                  (t === "PUNTUAL" ? " (un solo día)" : " (todos los días del semestre)"),
              }))}
              value={type}
              onChange={(e) => setType(e.target.value as ReservationType)}
            />
          </Field>

          <Field label="Aula" required>
            <SelectInput
              options={options}
              placeholder="Seleccione aula…"
              value={classroomId}
              onChange={(e) => setClassroomId(e.target.value)}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            {type === "RECURRENTE" ? (
              <Field label="Día de la semana" required>
                <SelectInput
                  options={[1, 2, 3, 4, 5, 6].map((d) => ({ value: String(d), label: DAY_NAMES[d] }))}
                  placeholder="Seleccione día…"
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(e.target.value)}
                />
              </Field>
            ) : (
              <Field label="Fecha puntual" required error={date !== "" && date < todayISO() ? "La fecha no puede ser anterior a hoy." : null}>
                <input
                  type="date"
                  min={todayISO()}
                  className="input-base"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </Field>
            )}
            <Field
              label="Bloque horario"
              required
              hint={
                currentSlot
                  ? `Bloque actual: ${currentSlot.label}`
                  : "Fuera del horario de bloques; seleccione uno manualmente."
              }
            >
              <SelectInput
                options={(slots.data ?? []).map((s) => ({
                  value: s.id,
                  label: `${s.label} (${s.startTime.slice(0, 5)}–${s.endTime.slice(0, 5)})`,
                }))}
                placeholder="Seleccione bloque…"
                value={timeSlotId}
                onChange={(e) => setTimeSlotId(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Motivo / nota" hint="Describa brevemente el uso solicitado.">
            <TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>

          <div className="border-t border-dashed border-slate-200 pt-3">
            <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold tracking-widest text-slate-500 uppercase">
              <ShieldCheck size={13} /> Verificación de disponibilidad
            </h3>

            {!readyToVerify ? (
              <p className="rounded-md bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                Complete aula, {type === "RECURRENTE" ? "día" : "fecha"} y bloque para verificar la
                disponibilidad.
              </p>
            ) : verifyInput && stateQuery.isFetching ? (
              <p className="animate-pulse rounded-md bg-sky-50 px-3 py-2 text-[11px] text-sky-700">
                Verificando disponibilidad…
              </p>
            ) : stateResult && meta ? (
              <div
                className={`flex items-start gap-2 rounded-md px-3 py-2 text-xs ${
                  isFree ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
                }`}
              >
                {isFree ? (
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                ) : (
                  <CircleAlert size={16} className="mt-0.5 shrink-0 text-rose-600" />
                )}
                <span>
                  <strong>{meta.label}:</strong> {meta.description}
                  {stateResult.reason ? ` — ${stateResult.reason}` : ""}
                  {stateResult.state === "OCUPADA" && stateResult.occupiedBy && (
                    <>
                      {" "}
                      (
                      {stateResult.occupiedBy.kind === "SCHEDULE"
                        ? `planilla: ${stateResult.occupiedBy.schedule.subject.name}`
                        : `reserva ${stateResult.occupiedBy.reservation.type.toLowerCase()}`}
                      )
                    </>
                  )}
                </span>
              </div>
            ) : null}

            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() =>
                  wm.openWindow("tabla-semanal", classroomId ? { classroomId } : undefined)
                }
              >
                Ver tabla semanal
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!isFree || create.isPending}
                onClick={() => void submit()}
              >
                Registrar reserva
              </button>
            </div>
            <p className="mt-1.5 text-right text-[10px] text-slate-400">
              El botón se habilita solo cuando la verificación indica LIBRE.
            </p>
          </div>
        </section>
      )}

      {type === "PUNTUAL" && fmtDate(todayISO()) && (
        <p className="text-center text-[11px] text-slate-400">
          Las reservas puntuales quedan libres en la Tabla Semanal al cancelarse o finalizar su fecha.
        </p>
      )}
    </div>
  );
}
