import type { ModuleProps } from "../../system/moduleTypes";
import { GraduationCap, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { useState, type SyntheticEvent } from "react";
import { apiErrorToMessage } from "../../../lib/errors";
import {
  useTeacherMutations,
  useTeachersQuery,
  type TeacherWriteInput,
} from "../../../lib/queries/teachers";
import type { Teacher } from "../../../lib/types";
import { emailError, requiredText } from "../../../lib/validation";
import { useConfirm } from "../../system/DialogHost";
import { useToast } from "../../system/ToastProvider";
import { Badge } from "../../ui/Badge";
import { DataTable, type Column } from "../../ui/DataTable";
import { Field, TextInput } from "../../ui/Field";
import { Modal } from "../../ui/Modal";

interface FormState {
  code: string;
  name: string;
  email: string;
}

export default function TeachersModule(_props: ModuleProps) {
  const toast = useToast();
  const confirm = useConfirm();

  const query = useTeachersQuery({ page: 1, pageSize: 100 });
  const { create, update, remove } = useTeacherMutations();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [form, setForm] = useState<FormState>({ code: "", name: "", email: "" });
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const openCreate = () => {
    setEditing(null);
    setForm({ code: "", name: "", email: "" });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (t: Teacher) => {
    setEditing(t);
    setForm({ code: t.code, name: t.name, email: t.email ?? "" });
    setErrors({});
    setModalOpen(true);
  };

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = {
      code: requiredText(form.code),
      name: requiredText(form.name),
      email: form.email.trim() === "" ? null : emailError(form.email),
    };
    setErrors(next);
    if (Object.values(next).some((v) => v)) return;
    const code = form.code.trim().toUpperCase();
    const name = form.name.trim();
    const email = form.email.trim() === "" ? null : form.email.trim();
    try {
      if (editing) {
        const input: Partial<TeacherWriteInput> = { name, email };
        if (code !== "") input.code = code;
        await update.mutateAsync({ id: editing.id, input });
        toast.success("Docente actualizado.");
      } else {
        await create.mutateAsync({ code, name, email });
        toast.success("Docente creado.");
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(apiErrorToMessage(err));
    }
  };

  const toggleActive = async (t: Teacher) => {
    try {
      await update.mutateAsync({ id: t.id, input: { active: !t.active } });
      toast.success(t.active ? "Docente desactivado." : "Docente activado.");
    } catch (err) {
      toast.error(apiErrorToMessage(err));
    }
  };

  const removeTeacher = async (t: Teacher) => {
    const ok = await confirm({
      title: "Eliminar docente",
      message: `¿Eliminar definitivamente a ${t.name}? La operación será rechazada si tiene horarios asociados.`,
      danger: true,
      confirmText: "Eliminar",
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(t.id);
      toast.success("Docente eliminado.");
    } catch (err) {
      toast.error(apiErrorToMessage(err));
    }
  };

  const columns: Column<Teacher>[] = [
    {
      key: "code",
      header: "Código",
      render: (t) => (
        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-bold text-slate-700">
          {t.code}
        </span>
      ),
    },
    { key: "name", header: "Nombre", render: (t) => <span className="text-xs font-semibold text-slate-800">{t.name}</span> },
    {
      key: "email",
      header: "Correo",
      headerClass: "hidden md:table-cell",
      cellClass: "hidden md:table-cell",
      render: (t) => <span className="text-xs text-slate-500">{t.email ?? "—"}</span>,
    },
    {
      key: "active",
      header: "Estado",
      render: (t) =>
        t.active ? (
          <Badge tone="success" dot>Activo</Badge>
        ) : (
          <Badge tone="neutral" dot>Inactivo</Badge>
        ),
    },
    {
      key: "actions",
      header: "Acciones",
      headerClass: "text-right w-36",
      cellClass: "text-right",
      render: (t) => (
        <div className="flex justify-end gap-1">
          <button type="button" title="Editar" className="btn btn-ghost btn-sm" onClick={() => openEdit(t)}>
            <Pencil size={13} />
          </button>
          <button
            type="button"
            title={t.active ? "Desactivar" : "Activar"}
            className="btn btn-ghost btn-sm"
            onClick={() => void toggleActive(t)}
          >
            <Power size={13} className={t.active ? "text-emerald-600" : "text-slate-400"} />
          </button>
          <button
            type="button"
            title="Eliminar"
            className="btn btn-ghost btn-sm hover:bg-rose-50 hover:text-rose-600"
            onClick={() => void removeTeacher(t)}
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="scroll-thin flex h-full min-h-0 flex-col gap-3 overflow-hidden p-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold tracking-wide text-slate-700 uppercase">
          <GraduationCap size={16} className="text-sky-700" /> Catálogo de docentes
        </h2>
        <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
          <Plus size={13} /> Nuevo docente
        </button>
      </div>

      <DataTable
        columns={columns}
        data={query.data?.data}
        rowKey={(t) => t.id}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        emptyIcon={GraduationCap}
        emptyMessage="Sin docentes registrados."
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Editar docente · ${editing.code}` : "Nuevo docente"}
        widthClass="max-w-md"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button
              type="submit"
              form="teacher-form"
              className="btn btn-primary"
              disabled={create.isPending || update.isPending}
            >
              Guardar
            </button>
          </>
        }
      >
        <form id="teacher-form" onSubmit={(e) => void submit(e)} className="space-y-3.5" noValidate>
          <Field label="Código" htmlFor="tea-code" error={errors.code} required hint="Slug del apellido. Ej.: soria">
            <TextInput
              id="tea-code"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            />
          </Field>
          <Field label="Nombre completo" htmlFor="tea-name" error={errors.name} required>
            <TextInput
              id="tea-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ej.: Ana Soria"
            />
          </Field>
          <Field label="Correo (opcional)" htmlFor="tea-email" error={errors.email}>
            <TextInput
              id="tea-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
