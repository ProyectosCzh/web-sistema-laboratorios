import { CalendarRange } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DAY_SHORT } from "../../../lib/constants";
import { useClassroomListForPick } from "../../../lib/queries/classrooms";
import { useAvailabilityGridQuery } from "../../../lib/queries/dashboard";
import { useActiveSemester, useSemestersQuery } from "../../../lib/queries/semesters";
import {
  buildEntriesFromClassroom,
  parseCellKey,
  WeeklyGrid,
  type GridEntryVM,
} from "../../shared/WeeklyGrid";
import { useAuth } from "../../system/AuthContext";
import { useToast } from "../../system/ToastProvider";
import { useWindowManager } from "../../system/WindowManager";
import { Field, SelectInput } from "../../ui/Field";
import { LoadingBlock } from "../../ui/States";

export default function WeeklyTableModule({
  params,
}: {
  params: Record<string, unknown>;
}) {
  const wm = useWindowManager();
  const toast = useToast();
  const { user } = useAuth();
  const isEncargado = user.role === "ENCARGADO";

  const paramClassroomId = typeof params.classroomId === "string" ? params.classroomId : "";

  const activeSemester = useActiveSemester();
  const semesters = useSemestersQuery({ page: 1, pageSize: 50 });
  const classrooms = useClassroomListForPick(true);

  const [classroomId, setClassroomId] = useState(paramClassroomId);
  const [semesterId, setSemesterId] = useState("");

  useEffect(() => {
    if (!semesterId && activeSemester) setSemesterId(activeSemester.id);
  }, [activeSemester, semesterId]);

  useEffect(() => {
    if (!classroomId) {
      const first = (classrooms.data?.data ?? []).find((c) => c.status === "ACTIVA");
      if (first) setClassroomId(first.id);
    }
  }, [classrooms.data, classroomId]);

  const ready = Boolean(classroomId && semesterId);
  const gridQuery = useAvailabilityGridQuery(ready ? { classroomId, semesterId } : null);

  const entriesByCell = useMemo<Record<string, GridEntryVM>>(() => {
    const grid = gridQuery.data;
    if (!grid) return {};
    const classroom = grid.classrooms.find((gc) => gc.classroom.id === classroomId);
    return classroom ? buildEntriesFromClassroom(classroom) : {};
  }, [gridQuery.data, classroomId]);

  const workingDays = gridQuery.data?.semester.workingDays ?? [1, 2, 3, 4, 5, 6];
  const timeSlots = gridQuery.data?.timeSlots ?? [];

  const handleCellClick = (key: string, entry: GridEntryVM | null) => {
    const { day, slotId } = parseCellKey(key);

    if (!entry) {
      if (!isEncargado) {
        wm.openWindow("nueva-reserva", { classroomId, dayOfWeek: day, timeSlotId: slotId });
        return;
      }
      toast.info(
        `Bloque libre (${DAY_SHORT[day] ?? day}). Asígnelo desde la Planilla o gestione reservas desde Supervisión.`,
      );
      return;
    }

    if (entry.kind === "SCHEDULE") {
      if (isEncargado) {
        wm.openWindow("planilla", { classroomId });
      } else {
        toast.info(`Ocupado por planilla: ${entry.title}. Solo el Encargado puede modificarla.`);
      }
      return;
    }

    if (isEncargado) {
      wm.openWindow("supervision-reservas", { classroomId });
    } else {
      toast.info(
        `${entry.title}${entry.subtitle ? ` (${entry.subtitle})` : ""} — gestione sus reservas en "Mis reservas".`,
      );
    }
  };

  return (
    <div className="scroll-thin flex h-full min-h-0 flex-col gap-3 overflow-hidden p-4">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-bold tracking-wide text-slate-700 uppercase">
          <CalendarRange size={16} className="text-sky-700" /> Tabla semanal de disponibilidad
        </h2>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Vista consolidada de planilla oficial y reservas del aula seleccionada.
          {!isEncargado && " Haga clic en un bloque disponible para solicitar una reserva."}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="w-56">
          <Field label="Aula">
            <SelectInput
              options={(classrooms.data?.data ?? [])
                .filter((c) => c.status !== "INACTIVA")
                .map((c) => ({ value: c.id, label: `${c.code} · ${c.name}` }))}
              value={classroomId}
              onChange={(e) => setClassroomId(e.target.value)}
            />
          </Field>
        </div>
        <div className="w-48">
          <Field label="Semestre">
            <SelectInput
              options={(semesters.data?.data ?? []).map((s) => ({
                value: s.id,
                label: s.isActive ? `${s.name} (activo)` : s.name,
              }))}
              value={semesterId}
              onChange={(e) => setSemesterId(e.target.value)}
            />
          </Field>
        </div>
      </div>

      {!ready ? (
        <LoadingBlock label="Seleccione aula y semestre…" />
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
            timeSlots={timeSlots}
            entries={entriesByCell}
            onCellClick={handleCellClick}
          />
          {timeSlots.length === 0 && (
            <p className="text-center text-xs text-slate-400">
              El turno del semestre no tiene bloques horarios definidos.
            </p>
          )}
        </>
      )}
    </div>
  );
}
