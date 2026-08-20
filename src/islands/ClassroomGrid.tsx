import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { api, apiErrorToMessage } from "../lib/api";
import { useAuth } from "../lib/auth";
import { CLASSROOM_TYPES, CLASSROOM_TYPE_LABELS } from "../lib/constants";
import { isEncargado } from "../lib/permissions";
import type { Classroom, ClassroomType } from "../lib/types";
import Modal from "./Modal";

interface ClassroomFormState {
  code: string;
  name: string;
  type: ClassroomType;
  capacity: string;
  location: string;
}

const emptyForm: ClassroomFormState = {
  code: "",
  name: "",
  type: "AULA",
  capacity: "",
  location: "",
};

export default function ClassroomGrid() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = isEncargado(user);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | ClassroomType>("");
  const [modal, setModal] = useState<{ mode: "create" } | { mode: "edit"; classroom: Classroom } | null>(null);
  const [form, setForm] = useState<ClassroomFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<Classroom | null>(null);

  const { data, isLoading, isError, error: queryError, refetch } = useQuery({
    queryKey: ["classrooms"],
    queryFn: async () =>
      (
        await api.get<{ classrooms: Classroom[] }>("/classrooms", {
          params: isAdmin ? { includeInactive: true } : {},
        })
      ).data.classrooms,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["classrooms"] });
    queryClient.invalidateQueries({ queryKey: ["stats"] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        code: form.code.trim(),
        name: form.name.trim(),
        type: form.type,
        capacity: form.capacity.trim() ? parseInt(form.capacity, 10) : undefined,
        location: form.location.trim() || null,
      };
      if (modal?.mode === "edit") {
        await api.patch(`/classrooms/${modal.classroom.id}`, body);
      } else {
        await api.post("/classrooms", body);
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
      await api.delete(`/classrooms/${id}`);
    },
    onSuccess: () => {
      setConfirmingDelete(null);
      invalidate();
    },
    onError: (err) => setError(apiErrorToMessage(err)),
  });

  const openCreate = () => {
    setForm(emptyForm);
    setError(null);
    setModal({ mode: "create" });
  };

  const openEdit = (classroom: Classroom) => {
    setForm({
      code: classroom.code,
      name: classroom.name,
      type: classroom.type,
      capacity: classroom.capacity != null ? String(classroom.capacity) : "",
      location: classroom.location ?? "",
    });
    setError(null);
    setModal({ mode: "edit", classroom });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    saveMutation.mutate();
  };

  const classrooms = (data ?? [])
    .filter((c) => (typeFilter ? c.type === typeFilter : true))
    .filter((c) =>
      search
        ? `${c.code} ${c.name}`.toLowerCase().includes(search.toLowerCase())
        : true,
    )
    .sort((a, b) => a.code.localeCompare(b.code));

  const inputClass =
    "w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";
  const labelClass = "mb-1 block text-sm font-medium text-gray-700";

  if (isLoading) {
    return <p className="text-sm text-gray-500">Cargando aulas...</p>;
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
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por código o nombre..."
          className="w-64 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as "" | ClassroomType)}
          className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">Todos los tipos</option>
          {CLASSROOM_TYPES.map((t) => (
            <option key={t} value={t}>
              {CLASSROOM_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        {isAdmin && (
          <button
            onClick={openCreate}
            className="ml-auto rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Nueva aula
          </button>
        )}
      </div>

      {classrooms.length === 0 ? (
        <p className="text-sm text-gray-500">No se encontraron aulas.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classrooms.map((classroom) => (
            <div
              key={classroom.id}
              className={`flex flex-col rounded-lg border bg-white p-4 ${
                classroom.active ? "border-gray-200" : "border-gray-300 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <a
                    href={`/aulas/${classroom.id}`}
                    className="text-lg font-bold text-blue-700 hover:underline"
                  >
                    {classroom.code}
                  </a>
                  <p className="text-sm text-gray-700">{classroom.name}</p>
                </div>
                {!classroom.active && (
                  <span className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-700">
                    Inactiva
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-gray-600">
                {CLASSROOM_TYPE_LABELS[classroom.type]}
                {classroom.capacity != null ? ` · Capacidad: ${classroom.capacity}` : ""}
                {classroom.location ? ` · ${classroom.location}` : ""}
              </p>
              <div className="mt-3 flex gap-2">
                <a
                  href={`/aulas/${classroom.id}`}
                  className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Ver horario
                </a>
                {isAdmin && (
                  <>
                    <button
                      onClick={() => openEdit(classroom)}
                      className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => setConfirmingDelete(classroom)}
                      className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                    >
                      Eliminar
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal title={modal.mode === "edit" ? "Editar aula" : "Nueva aula"} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>Código</label>
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className={inputClass}
                maxLength={20}
                required
              />
            </div>
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
              <label className={labelClass}>Tipo</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as ClassroomType })}
                className={inputClass}
              >
                {CLASSROOM_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {CLASSROOM_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Capacidad (opcional)</label>
              <input
                type="number"
                min={1}
                max={500}
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Ubicación (opcional)</label>
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className={inputClass}
                maxLength={200}
              />
            </div>
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

      {confirmingDelete && (
        <Modal title="Eliminar aula" onClose={() => setConfirmingDelete(null)}>
          <p className="text-sm text-gray-700">
            ¿Eliminar <strong>{confirmingDelete.code} - {confirmingDelete.name}</strong>? Se
            desactivará y dejará de mostrarse.
          </p>
          {error && (
            <div className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setConfirmingDelete(null)}
              className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              onClick={() => deleteMutation.mutate(confirmingDelete.id)}
              disabled={deleteMutation.isPending}
              className="rounded bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
