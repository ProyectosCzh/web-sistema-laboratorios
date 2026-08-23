import { CalendarClock, Info, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiErrorToMessage } from "../../../lib/errors";
import { slotLabel } from "../../../lib/format";
import { useClassroomListForPick } from "../../../lib/queries/classrooms";
import {
  useScheduleMutations,
  useSchedulesQuery,
  type ScheduleWriteInput,
} from "../../../lib/queries/schedules";
import { useActiveSemester, useSemestersQuery } from "../../../lib/queries/semesters";
import { useSubjectsQuery } from "../../../lib/queries/subjects";
import { useTeachersQuery } from "../../../lib/queries/teachers";
import { useTimeSlotsQuery } from "../../../lib/queries/timeSlots";
import type { Schedule } from "../../../lib/types";
import { parseCellKey, cellKey, vmFromSchedule, WeeklyGrid } from "../../shared/WeeklyGrid";
import { useToast } from "../../system/ToastProvider";
import { Field, SelectInput, TextArea } from "../../ui/Field";
import { Modal } from "../../ui/Modal";

interface BlockFormState {
  subjectId: string;
  teacherId: string;
  note: string;
}

const EMPTY_BLOCK: BlockFormState = { subjectId: "", teacherId: "", note: "" };

export default function SchedulesModule({ params }: { params: Record<string, unknown> }) {
  const toast = useToast();

  const paramClassroomId = typeof params.classroomId === "string" ? params.classroomId : "";
  const semesterList = useSemestersQuery({ page: 1, pageSize: 50 });
  const activeSemester = useActiveSemester();
  const classrooms = useClassroomListForPick(true);

  const [classroomId, setClassroomId] = useState(paramClassroomId);
  const [semesterId, setSemesterId] = useState("");

  useEffect(() => {
    if (!semesterId && activeSemester) setSemesterId(activeSemester.id);
  }, [activeSemester, semesterId]);

  const schedulesQuery = useSchedulesQuery(
    { classroomId, semesterId },
    Boolean(classroomId && semesterId),
  );

  const subjects = useSubjectsQuery({ page: 1, pageSize: 200 }, true);
  const teachers = useTeachersQuery({ page: 1, pageSize: 200 }, true);

  const activeSubjects = (subjects.data?.data ?? []).filter((s) => s.active);
  const activeTeachers = (teachers.data?.data ?? []).filter((t) => t.active);
  const selectedClassroom = (classrooms.data?.data ?? []).find((c) => c.id === classroomId);
  const isEditingInactiveSemester =
    Boolean(semesterId) && semesterId !== activeSemester?.id;

  const { create, update, remove } = useScheduleMutations();

  const [creating, setCreating] = useState<{ day: number; timeSlotId: string } | null>(null);
  const [blockForm, setBlockForm] = useState<BlockFormState>(EMPTY_BLOCK);
  const [formError, setFormError] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<Schedule | null>(null);

  const entries = useMemo(() => {
    const map: Record<string, ReturnType<typeof vmFromSchedule>> = {};
    for (const s of schedulesQuery.data ?? []) {
      map[cellKey(s.dayOfWeek, s.timeSlotId)] = vmFromSchedule(s);
    }
    return map;
  }, [schedulesQuery.data]);

  const workingDays = activeSemester?.workingDays ?? [1, 2, 3, 4, 5, 6];

  const allSlots = useTimeSlotsQuery(true);

  const gridTimeSlots = useMemo(() => {
    return [...(allSlots.data ?? [])].sort((a, b) => a.order - b.order);
  }, [allSlots.data]);

  const handleCellClick = (key: string, entry: unknown) => {
    if (!classroomId || !semesterId) return;
    if (entry && typeof entry === "object" && "raw" in entry) {
      const raw = (entry as { raw?: unknown }).raw;
      if (raw && typeof raw === "object" && "subject" in raw) {
        setEditTarget(raw as Schedule);
        return;
      }
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
      toast.error(apiErrorToMessage(err));
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
      toast.error(apiErrorToMessage(err));
    }
  };

  const removeBlock = async () => {
    if (!editTarget) return;
    try {
      await remove.mutateAsync(editTarget.id);
      toast.success("Bloque eliminado de la planilla.");
      setEditTarget(null);
    } catch (err) {
      toast.error(apiErrorToMessage(err));
    }
  };

  const subjectOptions = activeSubjects.map((s) => ({
    value: s.id,
    label: `${s.code} · ${s.name}`,
  }));
  const teacherOptions = [
    ...activeTeachers.map((t) => ({ value: t.id, label: `${t.code} · ${t.name}` })),
  ];

  return (
    <div className="scroll-thin flex h-full min-h-0 flex-col gap-3 overflow-hidden p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-2 flex items-center gap-2 text-sm font-bold tracking-wide text-slate-700 uppercase">
          <CalendarClock size={16} className="text-sky-700" /> Planilla de horarios
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
            options={(semesterList.data?.data ?? []).map((s) => ({
              value: s.id,
              label: `${s.name}${s.isActive ? " (activo)" : ""}`,
            }))}
            placeholder="Semestre…"
            value={semesterId}
            onChange={(e) => setSemesterId(e.target.value)}
          />
        </div>
        {selectedClassroom && (
          <span className="ml-auto text-[11px] text-slate-500">
            Clic en una celda para asignar o gestionar bloques.
          </span>
        )}
      </div>

      {isEditingInactiveSemester && (
        <p className="flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-800">
          <Info size={12} /> Está planificando sobre un semestre no activo (útil para preparar el próximo).
        </p>
      )}

      {!classroomId || !semesterId ? (
        <div className="flex flex-1 items-center justify-center text-xs text-slate-400">
          Seleccione un aula y un semestre para editar su planilla semanal.
        </div>
      ) : schedulesQuery.isLoading ? (
        <div className="flex flex-1 items-center justify-center text-xs text-slate-400">
          Cargando planilla…
        </div>
      ) : gridTimeSlots.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-xs text-slate-400">
          Esta aula no tiene bloques aún. Haga clic en una celda libre para asignar el primero
          (necesita al menos un bloque existente en algún aula del semestre para conocer los turnos).
        </div>
      ) : (
        <WeeklyGrid
          workingDays={workingDays}
          timeSlots={gridTimeSlots}
          entries={entries}
          onCellClick={handleCellClick}
        />
      )}

      <Modal
        open={Boolean(creating)}
        onClose={() => setCreating(null)}
        title={
          creating
            ? `Asignar bloque · ${DAY_LABEL(creating.day)}`
            : "Asignar bloque"
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
            {creating ? slotLabelText(creating.timeSlotId, schedulesQuery.data ?? []) : ""}
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
                    : [{ value: editTarget.subject.id, label: `${editTarget.subject.code} · ${editTarget.subject.name} (actual)` }]),
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

function DAY_LABEL(day: number): string {
  return ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][day] ?? `Día ${day}`;
}

function slotLabelText(timeSlotId: string, schedules: Schedule[]): string {
  const found = schedules.find((s) => s.timeSlotId === timeSlotId);
  return found ? slotLabel(found.timeSlot) : timeSlotId;
}
