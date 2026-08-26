import { CalendarCheck, CalendarPlus, Pencil, Trash2, XCircle, CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  DAY_NAMES,
  RESERVATION_STATUS_LABELS,
  RESERVATION_STATUS_TONES,
  RESERVATION_TYPE_LABELS,
} from "../../../lib/constants";
import { reservationErrorToMessage } from "../../../lib/errors";
import { fmtDate, fmtDateTime, slotLabel } from "../../../lib/format";
import { useClassroomListForPick } from "../../../lib/queries/classrooms";
import {
  useReservationMutations,
  useReservationsQuery,
} from "../../../lib/queries/reservations";
import { useActiveSemester, useSemestersQuery } from "../../../lib/queries/semesters";
import { useTimeSlotsQuery } from "../../../lib/queries/timeSlots";
import type {
  Reservation,
  ReservationStatus,
  ReservationType,
} from "../../../lib/types";
import { useAuth } from "../../system/AuthContext";
import { useConfirm } from "../../system/DialogHost";
import { useToast } from "../../system/ToastProvider";
import { useWindowManager } from "../../system/WindowManager";
import { Badge } from "../../ui/Badge";
import { DataTable, type Column } from "../../ui/DataTable";
import { Field, SelectInput, TextArea, TextInput } from "../../ui/Field";
import { Modal } from "../../ui/Modal";
import { Pagination } from "../../ui/Pagination";

interface EditState {
  id: string;
  type: ReservationType;
  classroomId: string;
  timeSlotId: string;
  dayOfWeek: string;
  date: string;
  note: string;
}

export function ReservationsPanel() {
  const toast = useToast();
  const confirm = useConfirm();
  const wm = useWindowManager();
  const { user } = useAuth();
  const isEncargado = user.role === "ENCARGADO";

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | "">("");
  const [typeFilter, setTypeFilter] = useState<ReservationType | "">("");
  const [classroomFilter, setClassroomFilter] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");
  const activeSemester = useActiveSemester();

  useEffect(() => {
    if (!semesterFilter && activeSemester) setSemesterFilter(activeSemester.id);
  }, [activeSemester, semesterFilter]);

  const query = useReservationsQuery({
    page,
    pageSize: 10,
    status: statusFilter || undefined,
    type: typeFilter || undefined,
    classroomId: classroomFilter || undefined,
    semesterId: semesterFilter || undefined,
  });

  const classrooms = useClassroomListForPick(true);
  const semesters = useSemestersQuery({ page: 1, pageSize: 50 });
  const timeSlotsQuery = useTimeSlotsQuery(true);
  const slotOptions = useMemo(
    () => [...(timeSlotsQuery.data ?? [])].sort((a, b) => a.order - b.order),
    [timeSlotsQuery.data],
  );
  const { setStatus, update, remove } = useReservationMutations();

  const [editState, setEditState] = useState<EditState | null>(null);

  const confirmReservation = async (r: Reservation) => {
    try {
      await setStatus.mutateAsync({ id: r.id, status: "CONFIRMADA" });
      toast.success("Reserva confirmada.");
    } catch (err) {
      toast.error(reservationErrorToMessage(err));
    }
  };

  const cancelReservation = async (r: Reservation) => {
    const ok = await confirm({
      title: "Cancelar reserva",
      message:
        r.type === "PUNTUAL"
          ? `¿Cancelar la reserva de ${r.classroom.code} el ${fmtDate(r.date)}? El espacio quedará libre en la Tabla Semanal.`
          : `¿Cancelar la reserva semanal de ${r.classroom.code} los ${DAY_NAMES[r.dayOfWeek ?? 1] ?? ""}?`,
      danger: true,
      confirmText: "Cancelar reserva",
    });
    if (!ok) return;
    try {
      await setStatus.mutateAsync({ id: r.id, status: "CANCELADA" });
      toast.success("Reserva cancelada.");
    } catch (err) {
      toast.error(reservationErrorToMessage(err));
    }
  };

  const deleteCancelled = async (r: Reservation) => {
    const ok = await confirm({
      title: "Eliminar registro",
      message: "¿Eliminar definitivamente este registro cancelado?",
      danger: true,
      confirmText: "Eliminar",
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(r.id);
      toast.success("Registro eliminado.");
    } catch (err) {
      toast.error(reservationErrorToMessage(err));
    }
  };

  const canEdit = (r: Reservation): boolean => {
    if (isEncargado) return r.status !== "CANCELADA";
    return r.requestedById === user.id && r.status === "PENDIENTE";
  };

  const openEdit = (r: Reservation) => {
    setEditState({
      id: r.id,
      type: r.type,
      classroomId: r.classroomId,
      timeSlotId: r.timeSlotId,
      dayOfWeek: r.dayOfWeek ? String(r.dayOfWeek) : "",
      date: r.date ? r.date.slice(0, 10) : "",
      note: r.note ?? "",
    });
  };

  const submitEdit = async () => {
    if (!editState) return;
    if (editState.type === "RECURRENTE" && !(Number(editState.dayOfWeek) >= 1 && Number(editState.dayOfWeek) <= 6)) {
      toast.error("Las reservas semanales requieren un día de la semana.");
      return;
    }
    if (editState.type === "PUNTUAL" && editState.date === "") {
      toast.error("Las reservas puntuales requieren una fecha específica.");
      return;
    }
    try {
      await update.mutateAsync({
        id: editState.id,
        input: {
          classroomId: editState.classroomId || undefined,
          timeSlotId: editState.timeSlotId || undefined,
          ...(editState.type === "RECURRENTE"
            ? { dayOfWeek: Number(editState.dayOfWeek) }
            : { date: editState.date }),
          note: editState.note.trim() === "" ? null : editState.note.trim(),
        },
      });
      toast.success("Reserva actualizada.");
      setEditState(null);
    } catch (err) {
      toast.error(reservationErrorToMessage(err));
    }
  };

  const whenLabel = (r: Reservation): string =>
    r.type === "PUNTUAL" && r.date
      ? fmtDate(r.date)
      : r.dayOfWeek
        ? DAY_NAMES[r.dayOfWeek] ?? `Día ${r.dayOfWeek}`
        : "—";

  const columns = useMemo<Column<Reservation>[]>(
    () => [
      {
        key: "created",
        header: "Solicitada",
        headerClass: "hidden xl:table-cell",
        cellClass: "hidden xl:table-cell",
        render: (r) => (
          <span className="text-[11px] whitespace-nowrap text-slate-500">
            {fmtDateTime(r.createdAt)}
          </span>
        ),
      },
      {
        key: "classroom",
        header: "Aula",
        render: (r) => (
          <div className="min-w-0">
            <span className="font-mono text-xs font-bold text-slate-800">{r.classroom.code}</span>
            <p className="truncate text-[11px] text-slate-400">{r.classroom.name}</p>
          </div>
        ),
      },
      {
        key: "type",
        header: "Tipo",
        render: (r) => (
          <Badge tone={r.type === "RECURRENTE" ? "info" : "neutral"}>
            {RESERVATION_TYPE_LABELS[r.type]}
          </Badge>
        ),
      },
      {
        key: "when",
        header: "Día / Fecha",
        render: (r) => <span className="text-xs whitespace-nowrap">{whenLabel(r)}</span>,
      },
      {
        key: "slot",
        header: "Bloque",
        render: (r) => (
          <span className="text-xs whitespace-nowrap">{slotLabel(r.timeSlot)}</span>
        ),
      },
      {
        key: "requester",
        header: isEncargado ? "Solicitante" : "Nota",
        headerClass: "hidden lg:table-cell",
        cellClass: "hidden lg:table-cell max-w-40",
        render: (r) =>
          isEncargado ? (
            <span className="truncate text-xs">{r.requestedBy.name}</span>
          ) : (
            <span title={r.note ?? ""} className="line-clamp-1 text-xs text-slate-500">
              {r.note ?? "—"}
            </span>
          ),
      },
      {
        key: "status",
        header: "Estado",
        render: (r) => (
          <Badge tone={RESERVATION_STATUS_TONES[r.status]} dot>
            {RESERVATION_STATUS_LABELS[r.status]}
          </Badge>
        ),
      },
      {
        key: "actions",
        header: "Acciones",
        headerClass: "text-right w-44",
        cellClass: "text-right",
        render: (r) => (
          <div className="flex justify-end gap-0.5">
            {isEncargado && r.status === "PENDIENTE" && (
              <button
                type="button"
                title="Confirmar"
                className="btn btn-primary btn-sm"
                disabled={setStatus.isPending}
                onClick={() => void confirmReservation(r)}
              >
                <CheckCircle2 size={13} />
              </button>
            )}
            {canEdit(r) && (
              <button
                type="button"
                title="Modificar"
                className="btn btn-ghost btn-sm"
                onClick={() => openEdit(r)}
              >
                <Pencil size={13} />
              </button>
            )}
            {r.status !== "CANCELADA" &&
              (isEncargado || (r.requestedById === user.id && r.status === "PENDIENTE")) && (
                <button
                  type="button"
                  title="Cancelar reserva"
                  className="btn btn-ghost btn-sm hover:bg-rose-50 hover:text-rose-600"
                  disabled={setStatus.isPending}
                  onClick={() => void cancelReservation(r)}
                >
                  <XCircle size={13} />
                </button>
              )}
            {isEncargado && r.status === "CANCELADA" && (
              <button
                type="button"
                title="Eliminar registro"
                className="btn btn-ghost btn-sm hover:bg-rose-50 hover:text-rose-600"
                onClick={() => void deleteCancelled(r)}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isEncargado, user.id, setStatus.isPending],
  );

  return (
    <div className="scroll-thin flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-36">
          <SelectInput
            options={(Object.keys(RESERVATION_STATUS_LABELS) as ReservationStatus[]).map((s) => ({
              value: s,
              label: RESERVATION_STATUS_LABELS[s],
            }))}
            placeholder="Todos los estados"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as ReservationStatus | "");
              setPage(1);
            }}
          />
        </div>
        <div className="w-32">
          <SelectInput
            options={[
              { value: "RECURRENTE", label: "Semanales" },
              { value: "PUNTUAL", label: "Puntuales" },
            ]}
            placeholder="Todos los tipos"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as ReservationType | "");
              setPage(1);
            }}
          />
        </div>
        {isEncargado && (
          <div className="w-44">
            <SelectInput
              options={(classrooms.data?.data ?? []).map((c) => ({
                value: c.id,
                label: c.code,
              }))}
              placeholder="Todas las aulas"
              value={classroomFilter}
              onChange={(e) => {
                setClassroomFilter(e.target.value);
                setPage(1);
              }}
            />
          </div>
        )}
        <div className="w-40">
          <SelectInput
            options={(semesters.data?.data ?? []).map((s) => ({
              value: s.id,
              label: s.name,
            }))}
            placeholder="Semestre…"
            value={semesterFilter}
            onChange={(e) => {
              setSemesterFilter(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="grow" />
        {!isEncargado && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => wm.openWindow("nueva-reserva")}
          >
            <CalendarPlus size={13} /> Nueva reserva
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={query.data?.data}
        rowKey={(r) => r.id}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        emptyIcon={CalendarCheck}
        emptyMessage={
          isEncargado
            ? "No hay reservas con esos filtros."
            : "No tienes reservas registradas todavía."
        }
      />

      {query.data && (
        <Pagination
          page={page}
          totalPages={query.data.meta.totalPages}
          total={query.data.meta.total}
          onPage={setPage}
        />
      )}

      <Modal
        open={Boolean(editState)}
        onClose={() => setEditState(null)}
        title="Modificar reserva"
        widthClass="max-w-md"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setEditState(null)}>
              Cancelar
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
        {editState && (
          <div className="space-y-3.5">
            <p className="rounded-md bg-sky-50 px-3 py-2 text-[11px] text-sky-800">
              Reserva <strong>{RESERVATION_TYPE_LABELS[editState.type].toLowerCase()}</strong> · el
              tipo no puede modificarse.
            </p>
            <Field label="Aula" required>
              <SelectInput
                options={(classrooms.data?.data ?? [])
                  .filter((c) => c.status === "ACTIVA")
                  .map((c) => ({ value: c.id, label: `${c.code} · ${c.name}` }))}
                value={editState.classroomId}
                onChange={(e) => setEditState((s) => (s ? { ...s, classroomId: e.target.value } : s))}
              />
            </Field>
            {editState.type === "RECURRENTE" ? (
              <Field label="Día de la semana" required>
                <SelectInput
                  options={[1, 2, 3, 4, 5, 6].map((d) => ({ value: String(d), label: DAY_NAMES[d] }))}
                  value={editState.dayOfWeek}
                  onChange={(e) => setEditState((s) => (s ? { ...s, dayOfWeek: e.target.value } : s))}
                />
              </Field>
            ) : (
              <Field label="Fecha puntual" required>
                <TextInput
                  type="date"
                  value={editState.date}
                  onChange={(e) => setEditState((s) => (s ? { ...s, date: e.target.value } : s))}
                />
              </Field>
            )}
            <Field
              label="Bloque horario"
              required
              hint="Si necesita un bloque que no aparece, ábralo desde la Tabla Semanal."
            >
              <SelectInput
                options={slotOptions.map((ts) => ({
                  value: ts.id,
                  label: `${ts.label} (${ts.startTime.slice(0, 5)}–${ts.endTime.slice(0, 5)})`,
                }))}
                value={editState.timeSlotId}
                onChange={(e) => setEditState((s) => (s ? { ...s, timeSlotId: e.target.value } : s))}
              />
            </Field>
            <Field label="Motivo / nota">
              <TextArea
                rows={2}
                value={editState.note}
                onChange={(e) => setEditState((s) => (s ? { ...s, note: e.target.value } : s))}
              />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
