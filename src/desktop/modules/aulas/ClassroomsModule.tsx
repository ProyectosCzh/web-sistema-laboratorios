import type { ModuleProps } from "../../system/moduleTypes";
import { DoorOpen, Pencil, Plus, Trash2, Wrench } from "lucide-react";
import { useState, type SyntheticEvent } from "react";
import {
  CLASSROOM_STATUS_LABELS,
  CLASSROOM_STATUS_TONES,
  CLASSROOM_TYPE_LABELS,
} from "../../../lib/constants";
import { apiErrorToMessage } from "../../../lib/errors";
import {
  useClassroomListForPick,
  useClassroomMutations,
} from "../../../lib/queries/classrooms";
import type { Classroom, ClassroomStatus, ClassroomType } from "../../../lib/types";
import { capacityError, requiredText } from "../../../lib/validation";
import { useConfirm } from "../../system/DialogHost";
import { useToast } from "../../system/ToastProvider";
import { Badge } from "../../ui/Badge";
import { DataTable, type Column } from "../../ui/DataTable";
import { Field, SelectInput, TextInput } from "../../ui/Field";
import { Modal } from "../../ui/Modal";
import { MaintenanceFormModal, MaintenanceList } from "./MaintenanceList";

const TYPE_OPTIONS = (Object.keys(CLASSROOM_TYPE_LABELS) as ClassroomType[]).map((t) => ({
  value: t,
  label: CLASSROOM_TYPE_LABELS[t],
}));

const STATUS_OPTIONS = (Object.keys(CLASSROOM_STATUS_LABELS) as ClassroomStatus[]).map((s) => ({
  value: s,
  label: CLASSROOM_STATUS_LABELS[s],
}));

interface FormState {
  code: string;
  name: string;
  type: ClassroomType;
  capacity: string;
  location: string;
  status: ClassroomStatus;
}

const EMPTY_FORM: FormState = {
  code: "",
  name: "",
  type: "AULA",
  capacity: "",
  location: "",
  status: "ACTIVA",
};

export default function ClassroomsModule(_props: ModuleProps) {
  const toast = useToast();
  const confirm = useConfirm();

  const [tab, setTab] = useState<"aulas" | "mantenimientos">("aulas");
  const [typeFilter, setTypeFilter] = useState<ClassroomType | "">("");

  const classroomsQuery = useClassroomListForPick(true);
  const { create, update, remove } = useClassroomMutations();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Classroom | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [maintTarget, setMaintTarget] = useState<string | null>(null);

  const all = classroomsQuery.data?.data ?? [];
  const rows = typeFilter ? all.filter((c) => c.type === typeFilter) : all;

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (c: Classroom) => {
    setEditing(c);
    setForm({
      code: c.code,
      name: c.name,
      type: c.type,
      capacity: c.capacity === null || c.capacity === undefined ? "" : String(c.capacity),
      location: c.location ?? "",
      status: c.status,
    });
    setErrors({});
    setModalOpen(true);
  };

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next: Record<string, string | null> = {
      code: requiredText(form.code),
      name: requiredText(form.name),
      capacity: capacityError(form.capacity),
    };
    setErrors(next);
    if (Object.values(next).some((v) => v)) return;
    try {
      const input = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        type: form.type,
        capacity: form.capacity.trim() === "" ? null : Number(form.capacity),
        location: form.location.trim() === "" ? null : form.location.trim(),
        status: form.status,
      };
      if (editing) {
        await update.mutateAsync({ id: editing.id, input });
        toast.success("Aula actualizada.");
      } else {
        await create.mutateAsync(input);
        toast.success("Aula registrada.");
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(apiErrorToMessage(err));
    }
  };

  const removeClassroom = async (c: Classroom) => {
    const ok = await confirm({
      title: "Dar de baja aula",
      message: `El aula ${c.code} pasará a estado INACTIVA y dejará de aparecer en la tabla semanal. ¿Continuar?`,
      danger: true,
      confirmText: "Dar de baja",
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(c.id);
      toast.success(`Aula ${c.code} dada de baja.`);
    } catch (err) {
      toast.error(apiErrorToMessage(err));
    }
  };

  const columns: Column<Classroom>[] = [
    {
      key: "code",
      header: "Código",
      render: (c) => (
        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-bold text-slate-700">
          {c.code}
        </span>
      ),
    },
    {
      key: "name",
      header: "Nombre",
      render: (c) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-slate-800">{c.name}</p>
          {c.location && <p className="truncate text-[11px] text-slate-400">{c.location}</p>}
        </div>
      ),
    },
    {
      key: "type",
      header: "Tipo",
      render: (c) => <span className="text-xs">{CLASSROOM_TYPE_LABELS[c.type]}</span>,
    },
    {
      key: "capacity",
      header: "Capacidad",
      headerClass: "hidden sm:table-cell",
      cellClass: "hidden sm:table-cell",
      render: (c) => <span className="text-xs tabular-nums">{c.capacity ?? "—"}</span>,
    },
    {
      key: "status",
      header: "Estado",
      render: (c) => (
        <Badge tone={CLASSROOM_STATUS_TONES[c.status]} dot>
          {CLASSROOM_STATUS_LABELS[c.status]}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      headerClass: "text-right w-36",
      cellClass: "text-right",
      render: (c) => (
        <div className="flex justify-end gap-1">
          <button
            type="button"
            title="Registrar mantenimiento"
            className="btn btn-ghost btn-sm"
            onClick={() => setMaintTarget(c.id)}
            disabled={c.status !== "ACTIVA"}
          >
            <Wrench size={13} />
          </button>
          <button
            type="button"
            title="Editar aula"
            className="btn btn-ghost btn-sm"
            onClick={() => openEdit(c)}
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            title="Dar de baja"
            disabled={remove.isPending}
            className="btn btn-ghost btn-sm hover:bg-rose-50 hover:text-rose-600"
            onClick={() => void removeClassroom(c)}
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="scroll-thin flex h-full min-h-0 flex-col gap-3 overflow-hidden p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold tracking-wide text-slate-700 uppercase">
          <DoorOpen size={16} className="text-sky-700" /> Gestión de aulas
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab("aulas")}
            className={`btn btn-sm ${tab === "aulas" ? "btn-primary" : "btn-secondary"}`}
          >
            Aulas
          </button>
          <button
            type="button"
            onClick={() => setTab("mantenimientos")}
            className={`btn btn-sm ${tab === "mantenimientos" ? "btn-primary" : "btn-secondary"}`}
          >
            Mantenimientos
          </button>
        </div>
      </div>

      {tab === "aulas" ? (
        <>
          <div className="flex items-end justify-between gap-2">
            <div className="w-56">
              <SelectInput
                options={TYPE_OPTIONS}
                placeholder="Todos los tipos"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as ClassroomType | "")}
              />
            </div>
            <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
              <Plus size={13} /> Registrar aula
            </button>
          </div>

          <DataTable
            columns={columns}
            data={rows}
            rowKey={(c) => c.id}
            loading={classroomsQuery.isLoading}
            error={classroomsQuery.error}
            onRetry={() => void classroomsQuery.refetch()}
            emptyIcon={DoorOpen}
            emptyMessage={
              typeFilter ? "No hay aulas de ese tipo." : "No hay aulas registradas."
            }
          />
        </>
      ) : (
        <MaintenanceList pageSize={8} />
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Editar aula · ${editing.code}` : "Registrar aula"}
        widthClass="max-w-md"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button
              type="submit"
              form="classroom-form"
              className="btn btn-primary"
              disabled={create.isPending || update.isPending}
            >
              {editing ? "Guardar cambios" : "Registrar"}
            </button>
          </>
        }
      >
        <form id="classroom-form" onSubmit={(e) => void submit(e)} className="space-y-3.5" noValidate>
          <Field label="Código" htmlFor="cl-code" error={errors.code} required hint="Identificador único. Ej.: D302">
            <TextInput
              id="cl-code"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            />
          </Field>
          <Field label="Nombre" htmlFor="cl-name" error={errors.name} required>
            <TextInput
              id="cl-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ej.: Laboratorio de Redes"
            />
          </Field>
          <Field label="Tipo de espacio" required>
            <SelectInput
              options={TYPE_OPTIONS}
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ClassroomType }))}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Capacidad" htmlFor="cl-cap" error={errors.capacity}>
              <TextInput
                id="cl-cap"
                inputMode="numeric"
                value={form.capacity}
                onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                placeholder="Ej.: 30"
              />
            </Field>
            <Field label="Estado">
              <SelectInput
                options={STATUS_OPTIONS}
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.value as ClassroomStatus }))
                }
              />
            </Field>
          </div>
          <Field label="Ubicación">
            <TextInput
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              placeholder="Ej.: Edificio D, 3er piso"
            />
          </Field>
        </form>
      </Modal>

      {maintTarget && (
        <MaintenanceFormModal
          open
          onClose={() => setMaintTarget(null)}
          defaultClassroomId={maintTarget}
        />
      )}
    </div>
  );
}
