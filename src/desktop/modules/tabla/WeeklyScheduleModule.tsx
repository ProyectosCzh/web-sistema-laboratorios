import {
  CalendarClock,
  CalendarRange,
  CheckCircle2,
  CircleAlert,
  Eye,
  Info,
  Pencil,
  ScanSearch,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AVAILABILITY_STATE_META, DAY_NAMES } from "../../../lib/constants";
import { apiErrorToMessage, isApiError } from "../../../lib/errors";
import { fmtDate, slotLabel, todayISO } from "../../../lib/format";
import {
  useClassroomListForPick,
  useClassroomStateQuery,
} from "../../../lib/queries/classrooms";
import { useAvailabilityGridQuery } from "../../../lib/queries/dashboard";
import {
  useScheduleMutations,
  useSchedulesQuery,
  type ScheduleWriteInput,
} from "../../../lib/queries/schedules";
import { useActiveSemester, useSemestersQuery } from "../../../lib/queries/semesters";
import { useSubjectsQuery } from "../../../lib/queries/subjects";
import { useTeachersQuery } from "../../../lib/queries/teachers";
import { useTimeSlotsQuery } from "../../../lib/queries/timeSlots";
import type { Schedule, TimeSlot, ClassroomStateResult } from "../../../lib/types";
import {
  buildEntriesFromClassroom,
  cellKey,
  parseCellKey,
  vmFromSchedule,
  WeeklyGrid,
  type GridEntryVM,
} from "../../shared/WeeklyGrid";
import { useAuth } from "../../system/AuthContext";
import { useToast } from "../../system/ToastProvider";
import { useWindowManager } from "../../system/WindowManager";
import { Badge } from "../../ui/Badge";
import { Field, SelectInput, TextArea } from "../../ui/Field";
import { Modal } from "../../ui/Modal";
import { LoadingBlock } from "../../ui/States";

interface BlockFormState {
  subjectId: string;
  teacherId: string;
  note: string;
}

const EMPTY_BLOCK: BlockFormState = { subjectId: "", teacherId: "", note: "" };

const BLOCK_ERROR_MESSAGES: Record<string, string> = {
  RESERVATION_CONFLICT: "El aula ya tiene un bloque asignado en ese día y turno.",
  TEACHER_CONFLICT: "El docente ya tiene un bloque en ese día y turno en otra aula.",
  CLASSROOM_UNAVAILABLE: "El aula no está disponible para asignar bloques.",
  NON_WORKING_DAY: "El día elegido no es hábil para el semestre seleccionado.",
};

function blockErrorToMessage(err: unknown): string {
  if (isApiError(err)) {
    const specific = BLOCK_ERROR_MESSAGES[err.code];
    if (specific) return specific;
  }
  return apiErrorToMessage(err);
}

function isScheduleRaw(raw: unknown): raw is Schedule {
  return typeof raw === "object" && raw !== null && "id" in raw && "subjectId" in raw;
}

function DAY_LABEL(day: number): string {
  return ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][day] ?? `Día ${day}`;
}

function slotLabelText(timeSlotId: string, slots: TimeSlot[]): string {
  const found = slots.find((s) => s.id === timeSlotId);
  return found ? slotLabel(found) : timeSlotId;
}

function weekDayToDate(dayOfWeek: number): string {
  const now = new Date();
  const utcDay = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const jsDay = utcDay.getUTCDay();
  const apiDay = jsDay === 0 ? 7 : jsDay;
  const diff = dayOfWeek - apiDay;
  const target = new Date(
    Date.UTC(utcDay.getUTCFullYear(), utcDay.getUTCMonth(), utcDay.getUTCDate() + diff),
  );
  return target.toISOString().slice(0, 10);
}

export default function WeeklyScheduleModule({
  params,
}: {
  params: Record<string, unknown>;
}) {
  const wm = useWindowManager();
  const toast = useToast();
  const { user } = useAuth();
  const isEncargado = user.role === "ENCARGADO";

  const paramClassroomId = typeof params.classroomId === "string" ? params.classroomId : "";
  const paramSemesterId = typeof params.semesterId === "string" ? params.semesterId : "";

  const activeSemester = useActiveSemester();
  const semesters = useSemestersQuery({ page: 1, pageSize: 50 });
  const classrooms = useClassroomListForPick(true);
  const allTimeSlots = useTimeSlotsQuery(true);

  const [classroomId, setClassroomId] = useState(paramClassroomId);
  const [semesterId, setSemesterId] = useState(paramSemesterId);
  const [editMode, setEditMode] = useState(false);
  const [selectedCell, setSelectedCell] = useState<string | null>(null);

  useEffect(() => {
    if (!semesterId && activeSemester) setSemesterId(activeSemester.id);
  }, [activeSemester, semesterId]);

  useEffect(() => {
    if (!classroomId) {
      const first = (classrooms.data?.data ?? []).find((c) => c.status === "ACTIVA");
      if (first) setClassroomId(first.id);
    }
  }, [classrooms.data, classroomId]);

  useEffect(() => {
    if (editMode) setSelectedCell(null);
  }, [editMode]);

  useEffect(() => {
    setSelectedCell(null);
  }, [classroomId, semesterId]);

  const ready = Boolean(classroomId && semesterId);

  const gridQuery = useAvailabilityGridQuery(
    !editMode && ready ? { classroomId, semesterId } : null,
  );

  const schedulesQuery = useSchedulesQuery(
    { classroomId, semesterId },
    editMode && ready,
  );

  const subjects = useSubjectsQuery({ page: 1, pageSize: 100 }, true);
  const teachers = useTeachersQuery({ page: 1, pageSize: 100 }, true);

  const activeSubjects = (subjects.data?.data ?? []).filter((s) => s.active);
  const activeTeachers = (teachers.data?.data ?? []).filter((t) => t.active);
  const selectedClassroom = (classrooms.data?.data ?? []).find((c) => c.id === classroomId);
  const isEditingInactiveSemester = Boolean(semesterId) && semesterId !== activeSemester?.id;

  const { create, update, remove } = useScheduleMutations();

  const [creating, setCreating] = useState<{ day: number; timeSlotId: string } | null>(null);
  const [blockForm, setBlockForm] = useState<BlockFormState>(EMPTY_BLOCK);
  const [formError, setFormError] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<Schedule | null>(null);

  const gridTimeSlots = useMemo(() => {
    return [...(allTimeSlots.data ?? [])].sort((a, b) => a.order - b.order);
  }, [allTimeSlots.data]);

  const viewEntries = useMemo<Record<string, GridEntryVM>>(() => {
    const grid = gridQuery.data;
    if (!grid) return {};
    const classroom = grid.classrooms.find((gc) => gc.classroom.id === classroomId);
    return classroom ? buildEntriesFromClassroom(classroom) : {};
  }, [gridQuery.data, classroomId]);

  const viewTimeSlots = gridQuery.data?.timeSlots ?? gridTimeSlots;

  const editEntries = useMemo(() => {
    const map: Record<string, GridEntryVM> = {};
    for (const s of schedulesQuery.data ?? []) {
      map[cellKey(s.dayOfWeek, s.timeSlotId)] = vmFromSchedule(s);
    }
    return map;
  }, [schedulesQuery.data]);

  const activeEntries = editMode ? editEntries : viewEntries;
  const workingDays = (editMode ? activeSemester?.workingDays : gridQuery.data?.semester.workingDays) ?? [1, 2, 3, 4, 5, 6];

  const handleViewCellClick = (key: string, _entry: GridEntryVM | null) => {
    if (!classroomId || !semesterId) return;
    setSelectedCell(key);
  };

  const handleEditCellClick = (key: string, entry: GridEntryVM | null) => {
    if (!classroomId || !semesterId) return;

    if (entry?.kind === "SCHEDULE" && isScheduleRaw(entry.raw)) {
      setBlockForm(EMPTY_BLOCK);
      setFormError(null);
      setEditTarget(entry.raw);
      return;
    }

    if (entry) {
      toast.info("Solo los bloques de planilla pueden editarse desde aquí.");
      return;
    }

    const { day, slotId } = parseCellKey(key);
    setBlockForm(EMPTY_BLOCK);
    setFormError(null);
    setCreating({ day, timeSlotId: slotId });
  };

  const submitCreate = async () => {
    if (!creating || !classroomId || !semesterId) return;
    if (!blockForm.subjectId) {
      setFormError("Seleccione una materia.");
      return;
    }
    const input: ScheduleWriteInput = {
      classroomId,
      semesterId,
      subjectId: blockForm.subjectId,
      teacherId: blockForm.teacherId || undefined,
      dayOfWeek: creating.day,
      timeSlotId: creating.timeSlotId,
      note: blockForm.note.trim() || undefined,
    };
    try {
      await create.mutateAsync(input);
      toast.success("Bloque asignado a la planilla.");
      setCreating(null);
    } catch (err) {
      toast.error(blockErrorToMessage(err));
    }
  };

  const submitEdit = async () => {
    if (!editTarget) return;
    if (!blockForm.subjectId && !editTarget.subjectId) return;
    try {
      await update.mutateAsync({
        id: editTarget.id,
        input: {
          subjectId: blockForm.subjectId || editTarget.subjectId,
          teacherId: blockForm.teacherId || null,
          note: blockForm.note.trim() || null,
        },
      });
      toast.success("Bloque actualizado.");
      setEditTarget(null);
    } catch (err) {
      toast.error(blockErrorToMessage(err));
    }
  };

  const removeBlock = async () => {
    if (!editTarget) return;
    try {
      await remove.mutateAsync(editTarget.id);
      toast.success("Bloque eliminado de la planilla.");
      setEditTarget(null);
    } catch (err) {
      toast.error(blockErrorToMessage(err));
    }
  };

  const subjectOptions = activeSubjects.map((s) => ({
    value: s.id,
    label: `${s.code} · ${s.name}`,
  }));
  const teacherOptions = activeTeachers.map((t) => ({
    value: t.id,
    label: `${t.code} · ${t.name}`,
  }));

  const selectedParsed = selectedCell ? parseCellKey(selectedCell) : null;
  const stateDate = selectedParsed ? weekDayToDate(selectedParsed.day) : todayISO();
  const stateTimeSlotId = selectedParsed?.slotId ?? "";

  const stateQuery = useClassroomStateQuery(
    selectedCell && classroomId ? classroomId : null,
    { date: stateDate, timeSlotId: stateTimeSlotId },
  );
  const stateResult: ClassroomStateResult | undefined = stateQuery.data;
  const stateMeta = stateResult ? AVAILABILITY_STATE_META[stateResult.state] : null;

  return (
    <div className="scroll-thin flex h-full min-h-0 flex-col gap-3 overflow-hidden p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-2 flex items-center gap-2 text-sm font-bold tracking-wide text-slate-700 uppercase">
          {editMode ? (
            <>
              <CalendarClock size={16} className="text-sky-700" /> Planilla de horarios
            </>
          ) : (
            <>
              <CalendarRange size={16} className="text-sky-700" /> Tabla semanal de disponibilidad
            </>
          )}
        </h2>
        <div className="w-56">
          <SelectInput
            options={(classrooms.data?.data ?? [])
              .filter((c) => c.status !== "INACTIVA")
              .map((c) => ({ value: c.id, label: `${c.code} · ${c.name}` }))}
            placeholder="Seleccione aula…"
            value={classroomId}
            onChange={(e) => setClassroomId(e.target.value)}
          />
        </div>
        <div className="w-44">
          <SelectInput
            options={(semesters.data?.data ?? []).map((s) => ({
              value: s.id,
              label: s.isActive ? `${s.name} (activo)` : s.name,
            }))}
            placeholder="Semestre…"
            value={semesterId}
            onChange={(e) => setSemesterId(e.target.value)}
          />
        </div>
        {isEncargado && (
          <button
            type="button"
            className={`btn btn-sm ${editMode ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setEditMode((m) => !m)}
          >
            {editMode ? (
              <>
                <Eye size={13} /> Modo vista
              </>
            ) : (
              <>
                <Pencil size={13} /> Modo edición
              </>
            )}
          </button>
        )}
        {!editMode && selectedClassroom && (
          <span className="ml-auto text-[11px] text-slate-500">
            Haga clic en un bloque para ver su estado en tiempo real.
          </span>
        )}
        {editMode && selectedClassroom && (
          <span className="ml-auto text-[11px] text-slate-500">
            Haga clic en una celda para asignar o gestionar bloques.
          </span>
        )}
      </div>

      {isEditingInactiveSemester && (
        <p className="flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-800">
          <Info size={12} /> Está planificando sobre un semestre no activo (útil para preparar el
          próximo).
        </p>
      )}

      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col">
          {!ready ? (
            <LoadingBlock label="Seleccione aula y semestre…" />
          ) : editMode ? (
            schedulesQuery.isLoading && !schedulesQuery.data ? (
              <LoadingBlock label="Cargando planilla…" />
            ) : gridTimeSlots.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-xs text-slate-400">
                Esta aula no tiene bloques aún. Haga clic en una celda libre para asignar el primero
                (necesita al menos un bloque existente en algún aula del semestre para conocer los
                turnos).
              </div>
            ) : (
              <WeeklyGrid
                workingDays={workingDays}
                timeSlots={gridTimeSlots}
                entries={activeEntries}
                onCellClick={handleEditCellClick}
              />
            )
          ) : gridQuery.isLoading && !gridQuery.data ? (
            <LoadingBlock label="Cargando tabla semanal…" />
          ) : gridQuery.error && !gridQuery.data ? (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              No se pudo cargar la tabla semanal. Intente nuevamente.
            </p>
          ) : (
            <>
              <WeeklyGrid
                workingDays={workingDays}
                timeSlots={viewTimeSlots}
                entries={activeEntries}
                onCellClick={handleViewCellClick}
              />
              {viewTimeSlots.length === 0 && (
                <p className="text-center text-xs text-slate-400">
                  El turno del semestre no tiene bloques horarios definidos.
                </p>
              )}
            </>
          )}
        </div>

        {selectedCell && !editMode && (
          <div className="w-72 shrink-0 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase">
                <ScanSearch size={14} className="text-sky-700" /> Estado del aula
              </h3>
              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                className="rounded p-0.5 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            </div>

            {stateQuery.isLoading && !stateQuery.data ? (
              <LoadingBlock label="Consultando estado…" />
            ) : stateQuery.error && !stateQuery.data ? (
              <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                No se pudo consultar el estado. Verifique que el bloque pertenezca al turno oficial e
                intente nuevamente.
              </p>
            ) : stateResult && stateMeta ? (
              <div className="flex flex-col items-center gap-3">
                <span
                  className={`flex h-16 w-16 items-center justify-center rounded-full ${
                    stateResult.state === "LIBRE"
                      ? "bg-emerald-100 text-emerald-600"
                      : stateResult.state === "OCUPADA"
                        ? "bg-rose-100 text-rose-600"
                        : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {stateResult.state === "LIBRE" ? (
                    <CheckCircle2 size={32} />
                  ) : stateResult.state === "OCUPADA" ? (
                    <CircleAlert size={32} />
                  ) : (
                    <Wrench size={30} />
                  )}
                </span>

                <div className="text-center">
                  <p className="text-base font-bold text-slate-800">{stateMeta.label}</p>
                  <p className="text-[11px] text-slate-500">{stateMeta.description}</p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs text-slate-600">
                  <Badge tone="info">{stateResult.classroom.code}</Badge>
                  <Badge tone="neutral">
                    <CalendarClock size={11} /> {fmtDate(stateResult.date)}
                  </Badge>
                  <Badge tone="neutral">{DAY_NAMES[stateResult.dayOfWeek] ?? "—"}</Badge>
                </div>

                {stateResult.reason && (
                  <p className="w-full rounded-md bg-slate-50 px-3 py-1.5 text-center text-[11px] text-slate-500">
                    {stateResult.reason}
                  </p>
                )}

                {stateResult.state === "OCUPADA" && stateResult.occupiedBy && (
                  <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-700">
                    {stateResult.occupiedBy.kind === "SCHEDULE" ? (
                      <>
                        <strong>Bloque de planilla:</strong>{" "}
                        {stateResult.occupiedBy.schedule.subject.name}
                        {stateResult.occupiedBy.schedule.teacher
                          ? ` · ${stateResult.occupiedBy.schedule.teacher.name}`
                          : ""}
                      </>
                    ) : (
                      <>
                        <strong>Reserva</strong>{" "}
                        {stateResult.occupiedBy.reservation.type === "PUNTUAL"
                          ? "puntual"
                          : "semanal"}{" "}
                        · {stateResult.occupiedBy.reservation.status.toLowerCase()}
                        {stateResult.occupiedBy.reservation.note
                          ? ` · ${stateResult.occupiedBy.reservation.note}`
                          : ""}
                      </>
                    )}
                  </div>
                )}

                {stateResult.state === "LIBRE" &&
                  (user.role === "AYUDANTE" ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() =>
                        wm.openWindow("nueva-reserva", {
                          classroomId: stateResult.classroomId,
                          date: stateDate,
                          timeSlotId: stateTimeSlotId,
                          dayOfWeek: stateResult.dayOfWeek,
                        })
                      }
                    >
                      Reservar ahora
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        setSelectedCell(null);
                        setEditMode(true);
                        setCreating({
                          day: selectedParsed!.day,
                          timeSlotId: selectedParsed!.slotId,
                        });
                        setBlockForm(EMPTY_BLOCK);
                        setFormError(null);
                      }}
                    >
                      Asignar en planilla
                    </button>
                  ))}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <Modal
        open={Boolean(creating)}
        onClose={() => setCreating(null)}
        title={
          creating ? `Asignar bloque · ${DAY_LABEL(creating.day)}` : "Asignar bloque"
        }
        widthClass="max-w-md"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setCreating(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={create.isPending}
              onClick={() => void submitCreate()}
            >
              Asignar bloque
            </button>
          </>
        }
      >
        <div className="space-y-3.5">
          <p className="rounded-md bg-sky-50 px-3 py-2 text-[11px] text-sky-800">
            Aula <strong>{selectedClassroom?.code}</strong> ·{" "}
            {creating ? DAY_LABEL(creating.day) : ""} ·{" "}
            {creating ? slotLabelText(creating.timeSlotId, gridTimeSlots) : ""}
          </p>
          <Field label="Materia" required>
            <SelectInput
              options={subjectOptions}
              placeholder="Seleccione materia activa…"
              value={blockForm.subjectId}
              onChange={(e) => setBlockForm((f) => ({ ...f, subjectId: e.target.value }))}
            />
          </Field>
          <Field label="Docente" hint="Opcional. El sistema valida que no tenga dobles turnos.">
            <SelectInput
              options={teacherOptions}
              placeholder="— Sin docente —"
              value={blockForm.teacherId}
              onChange={(e) => setBlockForm((f) => ({ ...f, teacherId: e.target.value }))}
            />
          </Field>
          <Field label="Nota (opcional)">
            <TextArea
              rows={2}
              value={blockForm.note}
              onChange={(e) => setBlockForm((f) => ({ ...f, note: e.target.value }))}
            />
          </Field>
          {formError && <p className="field-error">{formError}</p>}
        </div>
      </Modal>

      <Modal
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        title={`Editar bloque${editTarget ? ` · ${editTarget.subject.code}` : ""}`}
        widthClass="max-w-md"
        footer={
          <>
            <button
              type="button"
              className="btn btn-danger"
              disabled={remove.isPending}
              onClick={() => void removeBlock()}
            >
              <Trash2 size={13} /> Eliminar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={update.isPending}
              onClick={() => void submitEdit()}
            >
              Guardar cambios
            </button>
          </>
        }
      >
        {editTarget && (
          <div className="space-y-3.5">
            <p className="rounded-md bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
              {editTarget.classroom.code} · {DAY_LABEL(editTarget.dayOfWeek)} ·{" "}
              {slotLabel(editTarget.timeSlot)} · Asignado por {editTarget.assignedBy.name}
            </p>
            <Field label="Materia" required hint="Seleccione la nueva materia para reemplazar la actual.">
              <SelectInput
                options={[
                  ...(activeSubjects.some((s) => s.id === editTarget.subject.id)
                    ? []
                    : [
                        {
                          value: editTarget.subject.id,
                          label: `${editTarget.subject.code} · ${editTarget.subject.name} (actual)`,
                        },
                      ]),
                  ...subjectOptions,
                ]}
                placeholder="— Mantener actual —"
                value={blockForm.subjectId}
                onChange={(e) => setBlockForm((f) => ({ ...f, subjectId: e.target.value }))}
              />
            </Field>
            <Field label="Docente">
              <SelectInput
                options={teacherOptions}
                placeholder="— Sin docente —"
                value={blockForm.teacherId}
                onChange={(e) => setBlockForm((f) => ({ ...f, teacherId: e.target.value }))}
              />
            </Field>
            <Field label="Nota">
              <TextArea
                rows={2}
                value={blockForm.note}
                onChange={(e) => setBlockForm((f) => ({ ...f, note: e.target.value }))}
                placeholder={editTarget.note ?? ""}
              />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
