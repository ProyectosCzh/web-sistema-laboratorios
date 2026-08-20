import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { api, apiErrorToMessage } from "../lib/api";
import { useAuth } from "../lib/auth";
import { USER_ROLES, USER_ROLE_LABELS } from "../lib/constants";
import type { User, UserRole } from "../lib/types";
import Modal from "./Modal";

interface UserFormState {
  name: string;
  email: string;
  role: UserRole;
  password: string;
  active: boolean;
}

interface PendingUserAction {
  type: "delete" | "deactivate" | "activate";
  user: User;
}

const emptyForm: UserFormState = { name: "", email: "", role: "AYUDANTE", password: "", active: true };

export default function UsersTable() {
  const { user: me } = useAuth();
  const queryClient = useQueryClient();

  const [modal, setModal] = useState<{ mode: "create" } | { mode: "edit"; user: User } | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingUserAction | null>(null);

  const { data, isLoading, isError, error: queryError, refetch } = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await api.get<{ users: User[] }>("/users")).data.users,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["users"] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (modal?.mode === "edit") {
        const body: Record<string, string | boolean | UserRole> = {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
          active: form.active,
        };
        if (form.password.trim()) body.password = form.password;
        await api.patch(`/users/${modal.user.id}`, body);
      } else {
        await api.post("/users", {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
        });
      }
    },
    onSuccess: () => {
      setModal(null);
      invalidate();
    },
    onError: (err) => setError(apiErrorToMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/${id}`);
    },
    onSuccess: () => {
      setPendingAction(null);
      invalidate();
    },
    onError: (err) => setError(apiErrorToMessage(err)),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      await api.patch(`/users/${id}`, { active });
    },
    onSuccess: () => {
      setPendingAction(null);
      invalidate();
    },
    onError: (err) => setError(apiErrorToMessage(err)),
  });

  const openCreate = () => {
    setForm(emptyForm);
    setError(null);
    setModal({ mode: "create" });
  };

  const openActionConfirm = (type: PendingUserAction["type"], user: User) => {
    setError(null);
    setPendingAction({ type, user });
  };

  const openEdit = (user: User) => {
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      password: "",
      active: user.active,
    });
    setError(null);
    setModal({ mode: "edit", user });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (modal?.mode === "create" && form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    saveMutation.mutate();
  };

  const users = data ?? [];
  const inputClass =
    "w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";
  const labelClass = "mb-1 block text-sm font-medium text-gray-700";

  if (isLoading) {
    return <p className="text-sm text-gray-500">Cargando usuarios...</p>;
  }

  if (isError) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p>{apiErrorToMessage(queryError)}</p>
        <button
          onClick={() => refetch()}
          className="mt-2 rounded border border-red-300 px-3 py-1 text-sm hover:bg-red-100"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={openCreate}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Nuevo usuario
        </button>
      </div>

      {users.length === 0 ? (
        <p className="text-sm text-gray-500">Sin usuarios cargados.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-700">
                <th className="px-4 py-2 font-semibold">Nombre</th>
                <th className="px-4 py-2 font-semibold">Email</th>
                <th className="px-4 py-2 font-semibold">Rol</th>
                <th className="px-4 py-2 font-semibold">Estado</th>
                <th className="px-4 py-2 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-gray-100">
                  <td className="px-4 py-2">
                    {user.name}
                    {me?.id === user.id && (
                      <span className="ml-2 rounded bg-gray-200 px-1.5 py-0.5 text-xs text-gray-600">
                        Vos
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-gray-700">{user.email}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        user.role === "ENCARGADO"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {USER_ROLE_LABELS[user.role]}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        user.active ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {user.active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(user)}
                        className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Editar
                      </button>
                      {me?.id !== user.id && (
                        <>
                          <button
                            onClick={() =>
                              openActionConfirm(user.active ? "deactivate" : "activate", user)
                            }
                            className={`rounded border px-2 py-1 text-sm ${
                              user.active
                                ? "border-amber-300 text-amber-700 hover:bg-amber-50"
                                : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                            }`}
                          >
                            {user.active ? "Desactivar" : "Activar"}
                          </button>
                          <button
                            onClick={() => openActionConfirm("delete", user)}
                            className="rounded border border-red-300 px-2 py-1 text-sm text-red-700 hover:bg-red-50"
                          >
                            Eliminar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal
          title={modal.mode === "edit" ? "Editar usuario" : "Nuevo usuario"}
          onClose={() => setModal(null)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>Nombre</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass}
                maxLength={100}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Rol</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                className={inputClass}
              >
                {USER_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {USER_ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>
                Contraseña {modal.mode === "edit" ? "(dejar vacío para no cambiar)" : ""}
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className={inputClass}
                minLength={modal.mode === "create" ? 8 : undefined}
                maxLength={100}
                required={modal.mode === "create"}
              />
            </div>
            {modal.mode === "edit" && (
              <div>
                <label className={labelClass}>Estado</label>
                <select
                  value={form.active ? "true" : "false"}
                  onChange={(e) => setForm({ ...form, active: e.target.value === "true" })}
                  className={inputClass}
                >
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>
            )}
            {error && (
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saveMutation.isPending ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {pendingAction && (
        <Modal
          title={
            pendingAction.type === "delete"
              ? "Eliminar usuario"
              : pendingAction.type === "deactivate"
                ? "Desactivar usuario"
                : "Activar usuario"
          }
          onClose={() => setPendingAction(null)}
        >
          <p className="text-sm text-gray-700">
            {pendingAction.type === "delete" ? (
              <>
                ¿Eliminar definitivamente a <strong>{pendingAction.user.name}</strong> (
                {pendingAction.user.email})? Esta acción no se puede deshacer.
              </>
            ) : pendingAction.type === "deactivate" ? (
              <>
                ¿Desactivar a <strong>{pendingAction.user.name}</strong> ({pendingAction.user.email})?
                No podrá iniciar sesión hasta ser reactivado.
              </>
            ) : (
              <>
                ¿Activar a <strong>{pendingAction.user.name}</strong> ({pendingAction.user.email}) para
                permitirle iniciar sesión nuevamente?
              </>
            )}
          </p>
          {error && (
            <div className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setPendingAction(null)}
              className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                if (pendingAction.type === "delete") {
                  deleteMutation.mutate(pendingAction.user.id);
                  return;
                }
                statusMutation.mutate({
                  id: pendingAction.user.id,
                  active: pendingAction.type === "activate",
                });
              }}
              disabled={deleteMutation.isPending || statusMutation.isPending}
              className={`rounded px-3 py-2 text-sm font-medium text-white disabled:opacity-60 ${
                pendingAction.type === "delete"
                  ? "bg-red-600 hover:bg-red-700"
                  : pendingAction.type === "deactivate"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {pendingAction.type === "delete"
                ? deleteMutation.isPending
                  ? "Eliminando..."
                  : "Eliminar"
                : statusMutation.isPending
                  ? pendingAction.type === "deactivate"
                    ? "Desactivando..."
                    : "Activando..."
                  : pendingAction.type === "deactivate"
                    ? "Desactivar"
                    : "Activar"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
