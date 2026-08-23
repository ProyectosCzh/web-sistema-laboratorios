import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, type FormEvent, type ChangeEvent } from "react";
import { api, apiErrorToMessage } from "../lib/api";
import { useAuth } from "../lib/auth";
import { DAYS, COURSE_OFFERING_TYPE_LABELS } from "../lib/constants";
import { canModifySchedule } from "../lib/permissions";
import type { Schedule, TimeSlot, CourseOffering } from "../lib/types";
import Modal from "./Modal";

interface ReservationModalProps {
  classroomId: string;
  semesterId: string;
  cell?: { dayOfWeek: number; timeSlotId: string };
  schedule?: Schedule;
  onClose: () => void;
  onMutated: () => void;
}

export default function ReservationModal({
  classroomId,
  semesterId,
  cell,
  schedule,
  onClose,
  onMutated,
}: ReservationModalProps) {
  const { user } = useAuth();
  const [courseOfferingId, setCourseOfferingId] = useState<string>(schedule?.courseOfferingId ?? "");
  const [note, setNote] = useState(schedule?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const { data: timeSlots } = useQuery({
    queryKey: ["timeSlots"],
    queryFn: async () => (await api.get<{ timeSlots: TimeSlot[] }>("/time-slots")).data.timeSlots,
  });

  const { data: courseOfferings } = useQuery({
    queryKey: ["course-offerings", semesterId],
    queryFn: async () =>
      (
        await api.get<{ offerings: CourseOffering[] }>("/course-offerings", {
          params: { semesterId },
        })
      ).data.offerings,
  });

  const dayOfWeek = schedule ? schedule.dayOfWeek : cell?.dayOfWeek;
  const timeSlotId = schedule ? schedule.timeSlotId : cell?.timeSlotId;
  const timeSlot = timeSlots?.find((ts) => ts.id === timeSlotId);
  const dayLabel = dayOfWeek ? DAYS[dayOfWeek - 1] : undefined;

  const selectedOffering = courseOfferings?.find((o) => o.id === courseOfferingId);
  const canEdit = schedule ? canModifySchedule(user, schedule) : true;
  const canDelete = schedule ? canModifySchedule(user, schedule) : false;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!dayOfWeek || !timeSlotId) throw new Error("Celda inválida");
      if (!courseOfferingId) throw new Error("Seleccioná una comisión");
      const body = {
        classroomId,
        semesterId,
        courseOfferingId,
        dayOfWeek,
        timeSlotId,
        note: note.trim() || null,
      };
      if (schedule) {
        await api.patch(`/schedules/${schedule.id}`, body);
      } else {
        await api.post("/schedules", body);
      }
    },
    onSuccess: () => {
      onMutated();
      onClose();
    },
    onError: (err) => setError(apiErrorToMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!schedule) return;
      await api.delete(`/schedules/${schedule.id}`);
    },
    onSuccess: () => {
      onMutated();
      onClose();
    },
    onError: (err) => setError(apiErrorToMessage(err)),
  });

  const handleOfferingChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setCourseOfferingId(e.target.value);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!courseOfferingId) {
      setError("Seleccioná una comisión");
      return;
    }
    mutation.mutate();
  };

  const inputClass =
    "w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";
  const labelClass = "mb-1 block text-sm font-medium text-gray-700";

  if (!canEdit) {
    return (
      <Modal title="Bloque del horario" onClose={onClose}>
        <div className="space-y-3 text-sm">
          <p>
            <span className="text-gray-500">Día: </span>
            {dayLabel}
          </p>
          <p>
            <span className="text-gray-500">Turno: </span>
            {timeSlot?.label} ({timeSlot?.startTime} - {timeSlot?.endTime})
          </p>
          {selectedOffering && (
            <>
              <p>
                <span className="text-gray-500">Materia: </span>
                {selectedOffering.subject.code} - {selectedOffering.subject.name}
              </p>
              <p>
                <span className="text-gray-500">Sección: </span>
                {selectedOffering.section}
              </p>
              <p>
                <span className="text-gray-500">Tipo: </span>
                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800">
                  {COURSE_OFFERING_TYPE_LABELS[selectedOffering.type]}
                </span>
              </p>
              {selectedOffering.teacher && (
                <p>
                  <span className="text-gray-500">Docente: </span>
                  {selectedOffering.teacher.code} - {selectedOffering.teacher.name}
                </p>
              )}
            </>
          )}
          <p>
            <span className="text-gray-500">Nota: </span>
            {schedule?.note ?? "—"}
          </p>
          <p>
            <span className="text-gray-500">Registrado por: </span>
            {schedule?.assignedBy.name}
          </p>
          <p className="text-amber-700">
            No tenés permisos para modificar este bloque.
          </p>
          <button
            onClick={onClose}
            className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Cerrar
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={schedule ? "Editar bloque" : "Nueva reserva"} onClose={onClose}>
      <div className="mb-4 rounded bg-gray-50 px-3 py-2 text-sm text-gray-700">
        {dayLabel && timeSlot ? (
          <>
            {dayLabel} · {timeSlot.label} ({timeSlot.startTime} - {timeSlot.endTime})
          </>
        ) : (
          "Celda sin turno"
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Comisión</label>
          <select
            value={courseOfferingId}
            onChange={handleOfferingChange}
            className={inputClass}
            required
          >
            <option value="">Seleccioná una comisión</option>
            {courseOfferings
              ?.filter((o) => o.active)
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.subject.code} - {o.subject.name} · Sección {o.section} ·{" "}
                  {COURSE_OFFERING_TYPE_LABELS[o.type]}
                  {o.teacher ? ` · ${o.teacher.code}` : ""}
                </option>
              ))}
          </select>
        </div>

        {selectedOffering && (
          <div className="rounded bg-blue-50 p-3 text-sm space-y-1 border border-blue-100">
            <p><span className="font-medium text-gray-700">Materia:</span> {selectedOffering.subject.name}</p>
            <p><span className="font-medium text-gray-700">Sección:</span> {selectedOffering.section}</p>
            <p>
              <span className="font-medium text-gray-700">Tipo:</span>{" "}
              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800">
                {COURSE_OFFERING_TYPE_LABELS[selectedOffering.type]}
              </span>
            </p>
            {selectedOffering.teacher && (
              <p><span className="font-medium text-gray-700">Docente:</span> {selectedOffering.teacher.code} - {selectedOffering.teacher.name}</p>
            )}
          </div>
        )}

        <div>
          <label className={labelClass}>Nota (opcional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={inputClass}
            rows={2}
            maxLength={500}
          />
        </div>

        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          {schedule && canDelete ? (
            confirmingDelete ? (
              <span className="flex items-center gap-2 text-sm">
                <span className="text-gray-700">¿Eliminar?</span>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate()}
                  className="rounded bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  Sí, eliminar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  No
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="rounded border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
              >
                Eliminar
              </button>
            )
          ) : (
            <span />
          )}

          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {mutation.isPending ? "Guardando..." : schedule ? "Guardar cambios" : "Reservar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}