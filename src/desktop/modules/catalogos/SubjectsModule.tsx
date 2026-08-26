import type { ModuleProps } from "../../system/moduleTypes";
import { BookOpen, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { useState, type SyntheticEvent } from "react";
import { apiErrorToMessage } from "../../../lib/errors";
import {
  useSubjectMutations,
  useSubjectsQuery,
  type SubjectWriteInput,
} from "../../../lib/queries/subjects";
import type { Subject } from "../../../lib/types";
import { requiredText } from "../../../lib/validation";
import { useConfirm } from "../../system/DialogHost";
import { useToast } from "../../system/ToastProvider";
import { Badge } from "../../ui/Badge";
import { DataTable, type Column } from "../../ui/DataTable";
import { Field, TextInput } from "../../ui/Field";
import { Modal } from "../../ui/Modal";

interface FormState {
  code: string;
  name: string;
}

export default function SubjectsModule(_props: ModuleProps & { embedded?: boolean }) {
  const { embedded } = _props;
  const toast = useToast();
  const confirm = useConfirm();

  const query = useSubjectsQuery({ page: 1, pageSize: 100 });
  const { create, update, remove } = useSubjectMutations();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [form, setForm] = useState<FormState>({ code: "", name: "" });
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const openCreate = () => {
    setEditing(null);
    setForm({ code: "", name: "" });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (s: Subject) => {
    setEditing(s);
    setForm({ code: s.code, name: s.name });
    setErrors({});
    setModalOpen(true);
  };

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = { code: requiredText(form.code), name: requiredText(form.name) };
    setErrors(next);
    if (Object.values(next).some((v) => v)) return;
    const code = form.code.trim().toUpperCase();
    const name = form.name.trim();
    try {
      if (editing) {
        const input: Partial<SubjectWriteInput> = { name };
        if (code !== "") input.code = code;
        await update.mutateAsync({ id: editing.id, input });
        toast.success("Materia actualizada.");
      } else {
        await create.mutateAsync({ code, name });
        toast.success("Materia creada.");
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(apiErrorToMessage(err));
    }
  };

  const toggleActive = async (s: Subject) => {
    try {
      await update.mutateAsync({ id: s.id, input: { active: !s.active } });
      toast.success(s.active ? "Materia desactivada." : "Materia activada.");
    } catch (err) {
      toast.error(apiErrorToMessage(err));
    }
  };

  const removeSubject = async (s: Subject) => {
    const ok = await confirm({
      title: "Eliminar materia",
      message: `¿Eliminar definitivamente ${s.name}? La operación será rechazada si tiene horarios asociados.`,
      danger: true,
      confirmText: "Eliminar",
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(s.id);
      toast.success("Materia eliminada.");
    } catch (err) {
      toast.error(apiErrorToMessage(err));
    }
  };

  const columns: Column<Subject>[] = [
    {
      key: "code",
      header: "Código",
      render: (s) => (
        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-bold text-slate-700">
          {s.code}
        </span>
      ),
    },
    {
      key: "name",
      header: "Nombre",
      render: (s) => <span className="text-xs font-semibold text-slate-800">{s.name}</span>,
    },
    {
      key: "active",
      header: "Estado",
      render: (s) =>
        s.active ? (
          <Badge tone="success" dot>Activa</Badge>
        ) : (
          <Badge tone="neutral" dot>Inactiva</Badge>
        ),
    },
    {
      key: "actions",
      header: "Acciones",
      headerClass: "text-right w-36",
      cellClass: "text-right",
      render: (s) => (
        <div className="flex justify-end gap-1">
          <button type="button" title="Editar" className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}>
            <Pencil size={13} />
          </button>
          <button
            type="button"
            title={s.active ? "Desactivar" : "Activar"}
            className="btn btn-ghost btn-sm"
            onClick={() => void toggleActive(s)}
          >
            <Power size={13} className={s.active ? "text-emerald-600" : "text-slate-400"} />
          </button>
          <button
            type="button"
            title="Eliminar"
            className="btn btn-ghost btn-sm hover:bg-rose-50 hover:text-rose-600"
            onClick={() => void removeSubject(s)}
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
        <div className="flex justify-end">
          <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
            <Plus size={13} /> Nueva materia
          </button>
        </div>

        <DataTable
          columns={columns}
          data={query.data?.data}
          rowKey={(s) => s.id}
          loading={query.isLoading}
          error={query.error}
          onRetry={() => void query.refetch()}
          emptyIcon={BookOpen}
          emptyMessage="Sin materias registradas."
        />

        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editing ? `Editar materia · ${editing.code}` : "Nueva materia"}
          widthClass="max-w-md"
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                Cancelar
              </button>
              <button
                type="submit"
                form="subject-form"
                className="btn btn-primary"
                disabled={create.isPending || update.isPending}
              >
                Guardar
              </button>
            </>
          }
        >
          <form id="subject-form" onSubmit={(e) => void submit(e)} className="space-y-3.5" noValidate>
            <Field label="Código" htmlFor="sub-code" error={errors.code} required hint="Ej.: DD111">
              <TextInput
                id="sub-code"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              />
            </Field>
            <Field label="Nombre de la materia" htmlFor="sub-name" error={errors.name} required>
              <TextInput
                id="sub-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ej.: Diseño de Bases de Datos"
              />
            </Field>
          </form>
        </Modal>
      </>
    );
  }

  return (
    <div className="scroll-thin flex h-full min-h-0 flex-col gap-3 overflow-hidden p-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold tracking-wide text-slate-700 uppercase">
          <BookOpen size={16} className="text-sky-700" /> Catálogo de materias
        </h2>
        <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
          <Plus size={13} /> Nueva materia
        </button>
      </div>

      <DataTable
        columns={columns}
        data={query.data?.data}
        rowKey={(s) => s.id}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        emptyIcon={BookOpen}
        emptyMessage="Sin materias registradas."
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Editar materia · ${editing.code}` : "Nueva materia"}
        widthClass="max-w-md"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button
              type="submit"
              form="subject-form"
              className="btn btn-primary"
              disabled={create.isPending || update.isPending}
            >
              Guardar
            </button>
          </>
        }
      >
        <form id="subject-form" onSubmit={(e) => void submit(e)} className="space-y-3.5" noValidate>
          <Field label="Código" htmlFor="sub-code" error={errors.code} required hint="Ej.: DD111">
            <TextInput
              id="sub-code"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            />
          </Field>
          <Field label="Nombre de la materia" htmlFor="sub-name" error={errors.name} required>
            <TextInput
              id="sub-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ej.: Diseño de Bases de Datos"
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
