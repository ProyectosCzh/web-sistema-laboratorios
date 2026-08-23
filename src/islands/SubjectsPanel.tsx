import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { api, apiErrorToMessage } from "../lib/api";
import type { Subject } from "../lib/types";
import Modal from "./Modal";

interface SubjectFormState {
  code: string;
  name: string;
  active: boolean;
}

const emptyForm: SubjectFormState = { code: "", name: "", active: true };

export default function SubjectsPanel() {
  const queryClient = useQueryClient();

  const [modal, setModal] = useState<{ mode: "create" } | { mode: "edit"; subject: Subject } | null>(null);
  const [form, setForm] = useState<SubjectFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);

  const { data, isLoading, isError, error: queryError, refetch } = useQuery({
    queryKey: ["subjects", includeInactive],
    queryFn: async () =>
      (
        await api.get<{ data: Subject[] }>("/subjects", {
          params: { pageSize: 100, ...(includeInactive ? { includeInactive: true } : {}) },
        })
      ).data.data,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["subjects"] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = { code: form.code.trim().toUpperCase(), name: form.name.trim(), active: form.active };
      if (modal?.mode === "edit") {
        await api.patch(`/subjects/${modal.subject.id}`, body);
      } else {
        await api.post("/subjects", body);
      }
    },
    onSuccess: () => {
      setModal(null);
      invalidate();
    },
    onError: (err) => setError(apiErrorToMessage(err)),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.code.trim() || !form.name.trim()) {
      setError("Código y nombre son obligatorios");
      return;
    }
    saveMutation.mutate();
  };

  const openCreate = () => {
    setForm(emptyForm);
    setError(null);
    setModal({ mode: "create" });
  };

  const openEdit = (subject: Subject) => {
    setForm({
      code: subject.code,
      name: subject.name,
      active: subject.active,
    });
    setError(null);
    setModal({ mode: "edit", subject });
  };

  const subjects = data ?? [];
  const inputClass =
    "w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";
  const labelClass = "mb-1 block text-sm font-medium text-gray-700";

  if (isLoading) {
    return <p className="text-sm text-gray-500">Cargando materias...</p>;
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={openCreate} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Nueva materia
        </button>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Incluir inactivas
        </label>
      </div>

      {subjects.length === 0 ? (
        <p className="text-sm text-gray-500">Sin materias cargadas.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-700">
                <th className="px-4 py-2 font-semibold">Código</th>
                <th className="px-4 py-2 font-semibold">Nombre</th>
                <th className="px-4 py-2 font-semibold">Estado</th>
                <th className="px-4 py-2 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject) => (
                <tr key={subject.id} className="border-b border-gray-100">
                  <td className="px-4 py-2 font-medium text-gray-900">{subject.code}</td>
                  <td className="px-4 py-2 text-gray-700">{subject.name}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        subject.active ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {subject.active ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(subject)}
                        className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={modal.mode === "edit" ? "Editar materia" : "Nueva materia"} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>Código</label>
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
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
                maxLength={120}
                required
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
                  <option value="true">Activa</option>
                  <option value="false">Inactiva</option>
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
    </div>
  );
}