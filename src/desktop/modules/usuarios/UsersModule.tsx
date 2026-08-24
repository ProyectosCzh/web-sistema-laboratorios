import type { ModuleProps } from "../../system/moduleTypes";
import { Pencil, Power, Trash2, UserPlus, Users as UsersIcon } from "lucide-react";
import { useState, type SyntheticEvent } from "react";
import { ROLE_LABELS } from "../../../lib/constants";
import { apiErrorToMessage } from "../../../lib/errors";
import { fmtDate } from "../../../lib/format";
import { useAuth } from "../../system/AuthContext";
import { useUsersQuery, useUserMutations, type UserWriteInput } from "../../../lib/queries/users";
import type { User, UserRole } from "../../../lib/types";
import { emailError, minLengthError, requiredText } from "../../../lib/validation";
import { useConfirm } from "../../system/DialogHost";
import { useToast } from "../../system/ToastProvider";
import { Badge } from "../../ui/Badge";
import { DataTable, type Column } from "../../ui/DataTable";
import { Field, SelectInput, TextInput } from "../../ui/Field";
import { Modal } from "../../ui/Modal";
import { Pagination } from "../../ui/Pagination";
import { EmptyBlock } from "../../ui/States";

interface FormState {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

const EMPTY_FORM: FormState = { name: "", email: "", password: "", role: "AYUDANTE" };

export default function UsersModule(_props: ModuleProps) {
  const toast = useToast();
  const confirm = useConfirm();
  const { user: me } = useAuth();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<User | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const query = useUsersQuery({ page, pageSize: 10 });
  const { create, update, remove } = useUserMutations();

  const rows = (query.data?.data ?? []).filter((u) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: "", role: u.role });
    setErrors({});
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const next: Record<string, string | null> = {
      name: requiredText(form.name),
      email: emailError(form.email),
      password:
        editing && !form.password ? null : minLengthError(form.password, 8),
      role: form.role ? null : "Seleccione un rol.",
    };
    setErrors(next);
    return Object.values(next).every((v) => !v);
  };

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;
    try {
      if (editing) {
        const input: Partial<UserWriteInput> = {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
        };
        if (form.password) input.password = form.password;
        await update.mutateAsync({ id: editing.id, input });
        toast.success("Usuario actualizado.");
      } else {
        await create.mutateAsync({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
        });
        toast.success("Usuario creado.");
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(apiErrorToMessage(err));
    }
  };

  const toggleActive = async (u: User) => {
    try {
      await update.mutateAsync({ id: u.id, input: { active: !u.active } });
      toast.success(u.active ? `Usuario ${u.name} desactivado.` : `Usuario ${u.name} activado.`);
    } catch (err) {
      toast.error(apiErrorToMessage(err));
    }
  };

  const removeUser = async (u: User) => {
    const ok = await confirm({
      title: "Eliminar usuario",
      message: `¿Eliminar definitivamente a ${u.name}? Esta acción no se puede deshacer.`,
      danger: true,
      confirmText: "Eliminar",
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(u.id);
      toast.success("Usuario eliminado.");
    } catch (err) {
      toast.error(apiErrorToMessage(err));
    }
  };

  const columns: Column<User>[] = [
    {
      key: "name",
      header: "Nombre",
      render: (u) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-slate-800">{u.name}</p>
          <p className="truncate text-[11px] text-slate-400">{u.email}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: "Rol",
      render: (u) => (
        <Badge tone={u.role === "ENCARGADO" ? "info" : "neutral"}>
          {ROLE_LABELS[u.role]}
        </Badge>
      ),
    },
    {
      key: "active",
      header: "Estado",
      render: (u) =>
        u.active ? (
          <Badge tone="success" dot>
            Activo
          </Badge>
        ) : (
          <Badge tone="danger" dot>
            Inactivo
          </Badge>
        ),
    },
    {
      key: "createdAt",
      header: "Creación",
      headerClass: "hidden md:table-cell",
      cellClass: "hidden md:table-cell",
      render: (u) => <span className="text-xs whitespace-nowrap">{fmtDate(u.createdAt)}</span>,
    },
    {
      key: "actions",
      header: "Acciones",
      headerClass: "text-right w-36",
      cellClass: "text-right",
      render: (u) => (
        <div className="flex justify-end gap-1">
          <button
            type="button"
            title="Editar usuario"
            className="btn btn-ghost btn-sm"
            onClick={() => openEdit(u)}
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            title={u.active ? "Desactivar" : "Activar"}
            disabled={u.id === me.id}
            className="btn btn-ghost btn-sm"
            onClick={() => void toggleActive(u)}
          >
            <Power size={13} className={u.active ? "text-emerald-600" : "text-slate-400"} />
          </button>
          <button
            type="button"
            title="Eliminar"
            disabled={u.id === me.id || remove.isPending}
            className="btn btn-ghost btn-sm hover:bg-rose-50 hover:text-rose-600"
            onClick={() => void removeUser(u)}
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="scroll-thin flex h-full flex-col gap-3 overflow-y-auto p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold tracking-wide text-slate-700 uppercase">
          <UsersIcon size={16} className="text-sky-700" /> Gestión de usuarios y permisos
        </h2>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          <UserPlus size={14} /> Crear usuario
        </button>
      </div>

      <div className="max-w-xs">
        <TextInput
          placeholder="Buscar por nombre o correo…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(u) => u.id}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        emptyIcon={UsersIcon}
        emptyMessage={search ? "Ningún usuario coincide con la búsqueda." : "Sin usuarios registrados."}
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
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Editar usuario · ${editing.name}` : "Crear usuario"}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button
              type="submit"
              form="user-form"
              className="btn btn-primary"
              disabled={create.isPending || update.isPending}
            >
              {editing ? "Guardar cambios" : "Crear usuario"}
            </button>
          </>
        }
      >
        <form id="user-form" onSubmit={(e) => void submit(e)} className="space-y-3.5" noValidate>
          <Field label="Nombre completo" htmlFor="user-name" error={errors.name} required>
            <TextInput
              id="user-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ej.: María González"
            />
          </Field>
          <Field label="Correo electrónico" htmlFor="user-email" error={errors.email} required>
            <TextInput
              id="user-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="usuario@institucion.edu"
            />
          </Field>
          <Field
            label="Contraseña"
            htmlFor="user-password"
            error={errors.password}
            required={!editing}
            hint={editing ? "Dejar vacío para conservar la contraseña actual." : "Mínimo 8 caracteres."}
          >
            <TextInput
              id="user-password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
          </Field>
          <Field label="Rol del usuario" error={errors.role} required>
            <SelectInput
              options={[
                { value: "ENCARGADO", label: ROLE_LABELS.ENCARGADO },
                { value: "AYUDANTE", label: ROLE_LABELS.AYUDANTE },
              ]}
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
            />
          </Field>
        </form>
      </Modal>

      {!query.data && !query.isLoading && (
        <EmptyBlock message="Cargue de usuarios sin datos." />
      )}
    </div>
  );
}
