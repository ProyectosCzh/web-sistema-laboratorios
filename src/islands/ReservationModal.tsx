import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { api, apiErrorToMessage } from "../lib/api";
import { useAuth } from "../lib/auth";
import { DAYS, SCHEDULE_TYPE_LABELS } from "../lib/constants";
import { canModifySchedule, isEncargado } from "../lib/permissions";
import type { Schedule, ScheduleType, TimeSlot } from "../lib/types";
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
  const [type, setType] = useState<ScheduleType>(schedule?.type ?? "CLASE");
  const [title, setTitle] = useState(schedule?.title ?? "");
  const [teacher, setTeacher] = useState(schedule?.teacher ?? "");
  const [note, setNote] = useState(schedule?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const { data: timeSlots } = useQuery({
    queryKey: ["timeSlots"],
    queryFn: async () => (await api.get<{ timeSlots: TimeSlot[] }>("/time-slots")).data.timeSlots,
  });

  const dayOfWeek = schedule ? schedule.dayOfWeek : cell?.dayOfWeek;
  const timeSlotId = schedule ? schedule.timeSlotId : cell?.timeSlotId;
  const timeSlot = timeSlots?.find((ts) => ts.id === timeSlotId);
  const dayLabel = dayOfWeek ? DAYS[dayOfWeek - 1] : undefined;

  const canEdit = schedule ? canModifySchedule(user, schedule) : true;
  const canDelete = schedule ? canModifySchedule(user, schedule) : false;
  const maintenanceAllowed = isEncargado(user);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!dayOfWeek || !timeSlotId) throw new Error("Celda inválida");
      const body = {
        classroomId,
        semesterId,
        dayOfWeek,
        timeSlotId,
        type,
        title,
        teacher: teacher.trim() || null,
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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("El título es obligatorio");
      return;
    }
    mutation.mutate();
  };

  const inputClass =
    "w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";
  const labelClass = "mb-1 block text-sm font-medium text-gray-700";

  return (
    <Modal title={schedule ? "Bloque del horario" : "Nueva reserva"} onClose={onClose}>
      <div className="mb-4 rounded bg-gray-50 px-3 py-2 text-sm text-gray-700">
        {dayLabel && timeSlot ? (
          <>
            {dayLabel} · {timeSlot.label} ({timeSlot.startTime} - {timeSlot.endTime})
          </>
        ) : (
          "Celda sin turno"
        )}
      </div>

      {!canEdit ? (
        <div className="space-y-3 text-sm">
          <p>
            <span className="text-gray-500">Tipo: </span>
            {schedule ? SCHEDULE_TYPE_LABELS[schedule.type] : "-"}
          </p>
          <p>
            <span className="text-gray-500">Título: </span>
            {schedule?.title}
          </p>
          <p>
            <span className="text-gray-500">Docente: </span>
            {schedule?.teacher ?? "—"}
          </p>
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
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Tipo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ScheduleType)}
              className={inputClass}
            >
              <option value="CLASE">Clase</option>
              <option value="ACTIVIDAD">Actividad</option>
              {maintenanceAllowed && <option value="MANTENIMIENTO">Mantenimiento</option>}
            </select>
          </div>
          <div>
            <label className={labelClass}>Título</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              maxLength={120}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Docente (opcional)</label>
            <input
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
              className={inputClass}
              maxLength={100}
            />
          </div>
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
      )}
    </Modal>
  );
}
