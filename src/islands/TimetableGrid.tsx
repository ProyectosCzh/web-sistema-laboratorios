import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, apiErrorToMessage } from "../lib/api";
import {
  CELL_STATUS_COLORS,
  CELL_STATUS_LABELS,
  DAYS,
  SCHEDULE_TYPE_LABELS,
} from "../lib/constants";
import type { Schedule, TimeSlot } from "../lib/types";
import ReservationModal from "./ReservationModal";

interface TimetableGridProps {
  classroomId: string;
  semesterId: string;
}

interface ModalState {
  cell?: { dayOfWeek: number; timeSlotId: string };
  schedule?: Schedule;
}

export default function TimetableGrid({ classroomId, semesterId }: TimetableGridProps) {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<ModalState | null>(null);

  const timeSlotsQuery = useQuery({
    queryKey: ["timeSlots"],
    queryFn: async () => (await api.get<{ timeSlots: TimeSlot[] }>("/time-slots")).data.timeSlots,
  });

  const schedulesQuery = useQuery({
    queryKey: ["schedules", classroomId, semesterId],
    queryFn: async () =>
      (
        await api.get<{ schedules: Schedule[] }>("/schedules", {
          params: { classroomId, semesterId },
        })
      ).data.schedules,
  });

  const handleMutated = () => {
    queryClient.invalidateQueries({ queryKey: ["schedules", classroomId, semesterId] });
    queryClient.invalidateQueries({ queryKey: ["stats"] });
  };

  if (timeSlotsQuery.isLoading || schedulesQuery.isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-10 rounded bg-gray-200" />
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="h-12 rounded bg-gray-200" />
        ))}
      </div>
    );
  }

  const error = timeSlotsQuery.error ?? schedulesQuery.error;
  if (error || !timeSlotsQuery.data) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p>{apiErrorToMessage(error)}</p>
        <button
          onClick={() => {
            timeSlotsQuery.refetch();
            schedulesQuery.refetch();
          }}
          className="mt-2 rounded border border-red-300 px-3 py-1 text-sm hover:bg-red-100"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const timeSlots = [...timeSlotsQuery.data].sort((a, b) => a.order - b.order);
  const schedules = schedulesQuery.data ?? [];

  if (timeSlots.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
        No hay turnos configurados. Contactá al administrador.
      </div>
    );
  }

  const getSchedule = (day: number, timeSlotId: string): Schedule | undefined =>
    schedules.find((s) => s.dayOfWeek === day && s.timeSlotId === timeSlotId);

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border border-gray-200 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-700">
              Turno
            </th>
            {DAYS.map((day, index) => (
              <th
                key={day}
                className="border border-gray-200 bg-gray-50 px-3 py-2 text-center font-semibold text-gray-700"
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeSlots.map((timeSlot) => {
            return (
              <tr key={timeSlot.id}>
                <td className="whitespace-nowrap border border-gray-200 bg-gray-50 px-3 py-2">
                  <p className="font-medium text-gray-800">{timeSlot.label}</p>
                  <p className="text-xs text-gray-500">
                    {timeSlot.startTime} - {timeSlot.endTime}
                  </p>
                </td>
                {DAYS.map((day, index) => {
                  const dayOfWeek = index + 1;
                  const cellSchedule = getSchedule(dayOfWeek, timeSlot.id);
                  const cellStatus: keyof typeof CELL_STATUS_COLORS = !cellSchedule
                    ? "LIBRE"
                    : cellSchedule.type === "MANTENIMIENTO"
                      ? "MANTENIMIENTO"
                      : "OCUPADA";
                  const cellColors = CELL_STATUS_COLORS[cellStatus];

                  return (
                    <td
                      key={day}
                      className="border border-gray-200 p-0"
                      title={
                        cellSchedule
                          ? `${SCHEDULE_TYPE_LABELS[cellSchedule.type]} · ${cellSchedule.title}${
                              cellSchedule.teacher ? ` · ${cellSchedule.teacher}` : ""
                            }${cellSchedule.note ? ` · ${cellSchedule.note}` : ""} · ${cellSchedule.assignedBy.name}`
                          : CELL_STATUS_LABELS[cellStatus]
                      }
                    >
                      <button
                        onClick={() =>
                          cellSchedule
                            ? setModal({ schedule: cellSchedule })
                            : setModal({ cell: { dayOfWeek, timeSlotId: timeSlot.id } })
                        }
                        className={`h-16 w-full ${cellColors.bg} ${cellColors.hoverBg} p-1 text-left`}
                      >
                        {cellSchedule && (
                          <span className={`block text-xs font-medium ${cellColors.text}`}>
                            {cellSchedule.title}
                          </span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      {modal && (
        <ReservationModal
          classroomId={classroomId}
          semesterId={semesterId}
          cell={modal.cell}
          schedule={modal.schedule}
          onClose={() => setModal(null)}
          onMutated={handleMutated}
        />
      )}
    </div>
  );
}
