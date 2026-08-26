import type { ModuleProps } from "../../system/moduleTypes";
import { Clock, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, type SyntheticEvent } from "react";
import { slotRange } from "../../../lib/format";
import { apiErrorToMessage } from "../../../lib/errors";
import {
  useTimeSlotMutations,
  useTimeSlotsQuery,
} from "../../../lib/queries/timeSlots";
import type { TimeSlot } from "../../../lib/types";
import { firstError, minLengthError, requiredText, timeOrderError } from "../../../lib/validation";
import { useConfirm } from "../../system/DialogHost";
import { useToast } from "../../system/ToastProvider";
import { DataTable, type Column } from "../../ui/DataTable";
import { Field, TextInput } from "../../ui/Field";
import { Modal } from "../../ui/Modal";

interface FormState {
  label: string;
  startTime: string;
  endTime: string;
  order: string;
}

const EMPTY_FORM: FormState = { label: "", startTime: "", endTime: "", order: "" };

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function timeFormatError(value: string): string | null {
  return TIME_PATTERN.test(value) ? null : "Formato de hora inválido (HH:mm).";
}

export default function TimeSlotsModule(_props: ModuleProps & { embedded?: boolean }) {
  const { embedded } = _props;
  const toast = useToast();
  const confirm = useConfirm();

  const query = useTimeSlotsQuery(true);
  const sorted = [...(query.data ?? [])].sort((a, b) => a.order - b.order);
  const { create, update, remove } = useTimeSlotMutations();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TimeSlot | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (slot: TimeSlot) => {
    setEditing(slot);
    setForm({
      label: slot.label,
      startTime: slot.startTime.slice(0, 5),
      endTime: slot.endTime.slice(0, 5),
      order: String(slot.order),
    });
    setErrors({});
    setModalOpen(true);
  };

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next: Record<string, string | null> = {
      label: minLengthError(form.label, 3),
      startTime: requiredText(form.startTime) ?? timeFormatError(form.startTime),
      endTime: requiredText(form.endTime) ?? timeFormatError(form.endTime),
      order: /^\d+$/.test(form.order.trim()) ? null : "Orden numérico requerido.",
    };
    if (!next.startTime && !next.endTime) next.endTime = timeOrderError(form.startTime, form.endTime);
    setErrors(next);
    const first = firstError(next);
    if (first) {
      toast.error(first);
      return;
    }

    const input = {
      label: form.label.trim(),
      startTime: form.startTime,
      endTime: form.endTime,
      order: Number(form.order),
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, input });
        toast.success("Turno actualizado.");
      } else {
        await create.mutateAsync(input);
        toast.success("Turno creado.");
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(apiErrorToMessage(err));
    }
  };

  const removeSlot = async (slot: TimeSlot) => {
    const ok = await confirm({
      title: "Eliminar turno",
      message: `¿Eliminar ${slot.label}? Será rechazado si la planilla lo está usando.`,
      danger: true,
      confirmText: "Eliminar",
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(slot.id);
      toast.success("Turno eliminado.");
    } catch (err) {
      toast.error(apiErrorToMessage(err));
    }
  };

  const columns: Column<TimeSlot>[] = [
    {
      key: "order",
      header: "#",
      render: (s) => (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
          {s.order}
        </span>
      ),
    },
    { key: "label", header: "Turno", render: (s) => <span className="text-xs font-semibold text-slate-800">{s.label}</span> },
    {
      key: "range",
      header: "Horario",
      render: (s) => (
        <span className="font-mono text-xs text-slate-600">{slotRange(s)}</span>
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      headerClass: "text-right w-28",
      cellClass: "text-right",
      render: (s) => (
        <div className="flex justify-end gap-1">
          <button type="button" title="Editar" className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}>
            <Pencil size={13} />
          </button>
          <button
            type="button"
            title="Eliminar"
            className="btn btn-ghost btn-sm hover:bg-rose-50 hover:text-rose-600"
            onClick={() => void removeSlot(s)}
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  if (embedded) {
    return (
      <>
        <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] text-sky-800">
          Los bloques horarios son globales para toda la institución y alimentan la Tabla Semanal.
        </p>

        <div className="flex justify-end">
          <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
            <Plus size={13} /> Nuevo bloque
          </button>
        </div>

        <DataTable
          columns={columns}
          data={sorted}
          rowKey={(s) => s.id}
          loading={query.isLoading}
          error={query.error}
          onRetry={() => void query.refetch()}
          emptyIcon={Clock}
          emptyMessage="Sin bloques horarios definidos."
        />

        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editing ? `Editar bloque · ${editing.label}` : "Nuevo bloque horario"}
          widthClass="max-w-md"
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                Cancelar
              </button>
              <button
                type="submit"
                form="slot-form"
                className="btn btn-primary"
                disabled={create.isPending || update.isPending}
              >
                Guardar
              </button>
            </>
          }
        >
          <form id="slot-form" onSubmit={(e) => void submit(e)} className="space-y-3.5" noValidate>
            <Field label="Etiqueta" htmlFor="slot-label" error={errors.label} required hint="Ej.: Bloque 1">
              <TextInput
                id="slot-label"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Inicio" htmlFor="slot-start" error={errors.startTime} required>
                <TextInput
                  id="slot-start"
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                />
              </Field>
              <Field label="Fin" htmlFor="slot-end" error={errors.endTime} required>
                <TextInput
                  id="slot-end"
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                />
              </Field>
              <Field label="Orden" htmlFor="slot-order" error={errors.order} required>
                <TextInput
                  id="slot-order"
                  inputMode="numeric"
                  value={form.order}
                  onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
                  placeholder="1"
                />
              </Field>
            </div>
          </form>
        </Modal>
      </>
    );
  }

  return (
    <div className="scroll-thin flex h-full min-h-0 flex-col gap-3 overflow-hidden p-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold tracking-wide text-slate-700 uppercase">
          <Clock size={16} className="text-sky-700" /> Bloques horarios oficiales
        </h2>
        <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
          <Plus size={13} /> Nuevo bloque
        </button>
      </div>

      <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] text-sky-800">
        Los bloques horarios son globales para toda la institución y alimentan la Tabla Semanal.
      </p>

      <DataTable
        columns={columns}
        data={sorted}
        rowKey={(s) => s.id}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        emptyIcon={Clock}
        emptyMessage="Sin bloques horarios definidos."
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Editar bloque · ${editing.label}` : "Nuevo bloque horario"}
        widthClass="max-w-md"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button
              type="submit"
              form="slot-form"
              className="btn btn-primary"
              disabled={create.isPending || update.isPending}
            >
              Guardar
            </button>
          </>
        }
      >
        <form id="slot-form" onSubmit={(e) => void submit(e)} className="space-y-3.5" noValidate>
          <Field label="Etiqueta" htmlFor="slot-label" error={errors.label} required hint="Ej.: Bloque 1">
            <TextInput
              id="slot-label"
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Inicio" htmlFor="slot-start" error={errors.startTime} required>
              <TextInput
                id="slot-start"
                type="time"
                value={form.startTime}
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
              />
            </Field>
            <Field label="Fin" htmlFor="slot-end" error={errors.endTime} required>
              <TextInput
                id="slot-end"
                type="time"
                value={form.endTime}
                onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
              />
            </Field>
            <Field label="Orden" htmlFor="slot-order" error={errors.order} required>
              <TextInput
                id="slot-order"
                inputMode="numeric"
                value={form.order}
                onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
                placeholder="1"
              />
            </Field>
          </div>
        </form>
      </Modal>
    </div>
  );
}
