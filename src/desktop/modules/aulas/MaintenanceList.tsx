import { Trash2, Wrench } from "lucide-react";
import { useState } from "react";
import { MAINTENANCE_STATUS_LABELS, MAINTENANCE_STATUS_TONES } from "../../../lib/constants";
import { apiErrorToMessage } from "../../../lib/errors";
import { fmtDate, todayISO } from "../../../lib/format";
import {
  useMaintenanceQuery,
  useMaintenanceMutations,
} from "../../../lib/queries/maintenance";
import { useClassroomListForPick } from "../../../lib/queries/classrooms";
import type { MaintenanceLog, MaintenanceStatus } from "../../../lib/types";
import { requiredText } from "../../../lib/validation";
import { useConfirm } from "../../system/DialogHost";
import { useToast } from "../../system/ToastProvider";
import { Badge } from "../../ui/Badge";
import { DataTable, type Column } from "../../ui/DataTable";
import { Field, SelectInput, TextArea, TextInput } from "../../ui/Field";
import { Modal } from "../../ui/Modal";
import { Pagination } from "../../ui/Pagination";

const STATUS_OPTIONS = (Object.keys(MAINTENANCE_STATUS_LABELS) as MaintenanceStatus[]).map(
  (s) => ({ value: s, label: MAINTENANCE_STATUS_LABELS[s] }),
);

export function MaintenanceFormModal({
  open,
  onClose,
  defaultClassroomId,
}: {
  open: boolean;
  onClose: () => void;
  defaultClassroomId?: string;
}) {
  const toast = useToast();
  const classrooms = useClassroomListForPick(open);
  const { create } = useMaintenanceMutations();
  const [classroomId, setClassroomId] = useState(defaultClassroomId ?? "");
  const [date, setDate] = useState(todayISO());
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const options = (classrooms.data?.data ?? [])
    .filter((c) => c.status === "ACTIVA")
    .map((c) => ({ value: c.id, label: `${c.code} · ${c.name}` }));

  const submit = async () => {
    const next = {
      classroomId: options.length > 0 ? requiredText(classroomId) : "No hay aulas activas.",
      date: requiredText(date),
      reason: requiredText(reason),
    };
    setErrors(next);
    if (Object.values(next).some((v) => v)) return;
    try {
      await create.mutateAsync({ classroomId, date, reason: reason.trim() });
      toast.success("Mantenimiento registrado. El aula quedó bloqueada para reservas.");
      onClose();
    } catch (err) {
      toast.error(apiErrorToMessage(err));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar mantenimiento"
      widthClass="max-w-md"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={create.isPending}
            onClick={() => void submit()}
          >
            Registrar
          </button>
        </>
      }
    >
      <div className="space-y-3.5">
        <Field label="Aula" error={errors.classroomId} required>
          <SelectInput
            options={options}
            placeholder="Seleccione un aula…"
            value={classroomId}
            onChange={(e) => setClassroomId(e.target.value)}
          />
        </Field>
        <Field label="Fecha de reporte" error={errors.date} required>
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Motivo / detalle" error={errors.reason} required>
          <TextArea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej.: Falla eléctrica en bancada 3…"
          />
        </Field>
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          Al registrar el mantenimiento, el aula pasa a estado{" "}
          <strong>EN_MANTENIMIENTO</strong> y se bloquean nuevas reservas hasta completarlo.
        </p>
      </div>
    </Modal>
  );
}

export function MaintenanceList({ pageSize = 10 }: { pageSize?: number }) {
  const toast = useToast();
  const confirm = useConfirm();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<MaintenanceStatus | "">("");
  const [classroomId, setClassroomId] = useState("");

  const query = useMaintenanceQuery({
    page,
    pageSize,
    status: status || undefined,
    classroomId: classroomId || undefined,
  });
  const classrooms = useClassroomListForPick();
  const { setStatus: changeStatus, remove } = useMaintenanceMutations();
  const [formOpen, setFormOpen] = useState(false);

  const advance = async (log: MaintenanceLog, next: MaintenanceStatus) => {
    try {
      await changeStatus.mutateAsync({ id: log.id, status: next });
      if (next === "COMPLETADO") {
        toast.success("Mantenimiento completado. El aula vuelve a estar activa.");
      }
    } catch (err) {
      toast.error(apiErrorToMessage(err));
    }
  };

  const removeLog = async (log: MaintenanceLog) => {
    const ok = await confirm({
      title: "Eliminar mantenimiento",
      message: "¿Eliminar este registro? Si es el último abierto del aula, esta volverá a estado ACTIVA.",
      danger: true,
      confirmText: "Eliminar",
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(log.id);
      toast.success("Registro eliminado.");
    } catch (err) {
      toast.error(apiErrorToMessage(err));
    }
  };

  const columns: Column<MaintenanceLog>[] = [
    {
      key: "classroom",
      header: "Aula",
      render: (log) => (
        <div className="min-w-0">
          <span className="font-mono text-xs font-bold text-slate-800">{log.classroom.code}</span>
          <span className="ml-2 truncate text-xs text-slate-500">{log.classroom.name}</span>
        </div>
      ),
    },
    {
      key: "date",
      header: "Fecha",
      render: (log) => <span className="text-xs whitespace-nowrap">{fmtDate(log.date)}</span>,
    },
    {
      key: "reason",
      header: "Motivo",
      cellClass: "max-w-64",
      render: (log) => (
        <span title={log.reason} className="line-clamp-2 text-xs">
          {log.reason}
        </span>
      ),
    },
    {
      key: "status",
      header: "Estado",
      render: (log) => (
        <Badge tone={MAINTENANCE_STATUS_TONES[log.status]} dot>
          {MAINTENANCE_STATUS_LABELS[log.status]}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      headerClass: "text-right w-44",
      cellClass: "text-right",
      render: (log) => (
        <div className="flex justify-end gap-1">
          {log.status === "REPORTADO" && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={changeStatus.isPending}
              onClick={() => void advance(log, "EN_PROGRESO")}
            >
              Iniciar
            </button>
          )}
          {log.status !== "COMPLETADO" && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={changeStatus.isPending}
              onClick={() => void advance(log, "COMPLETADO")}
            >
              Completar
            </button>
          )}
          <button
            type="button"
            title="Eliminar registro"
            className="btn btn-ghost btn-sm hover:bg-rose-50 hover:text-rose-600"
            onClick={() => void removeLog(log)}
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="scroll-thin flex h-full min-h-0 flex-col gap-3 overflow-y-auto">
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-40">
          <SelectInput
            options={STATUS_OPTIONS}
            placeholder="Todos los estados"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as MaintenanceStatus | "");
              setPage(1);
            }}
          />
        </div>
        <div className="w-56">
          <SelectInput
            options={(classrooms.data?.data ?? []).map((c) => ({
              value: c.id,
              label: `${c.code} · ${c.name}`,
            }))}
            placeholder="Todas las aulas"
            value={classroomId}
            onChange={(e) => {
              setClassroomId(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="grow" />
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setFormOpen(true)}>
          <Wrench size={13} /> Registrar mantenimiento
        </button>
      </div>

      <DataTable
        columns={columns}
        data={query.data?.data}
        rowKey={(log) => log.id}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        emptyIcon={Wrench}
        emptyMessage="Sin registros de mantenimiento."
      />

      {query.data && query.data.meta.totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={query.data.meta.totalPages}
          total={query.data.meta.total}
          onPage={setPage}
        />
      )}

      {formOpen && (
        <MaintenanceFormModal open onClose={() => setFormOpen(false)} defaultClassroomId={classroomId || undefined} />
      )}
    </div>
  );
}
