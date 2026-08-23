import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { api, apiErrorToMessage } from "../lib/api";
import type { Semester } from "../lib/types";
import Modal from "./Modal";

interface SemesterFormState {
  name: string;
  startDate: string;
  endDate: string;
}

const emptyForm: SemesterFormState = { name: "", startDate: "", endDate: "" };

function toDateInput(iso: string): string {
  return iso.slice(0, 10);
}

export default function SemestersPanel() {
  const queryClient = useQueryClient();

  const [modal, setModal] = useState<{ mode: "create" } | { mode: "edit"; semester: Semester } | null>(null);
  const [form, setForm] = useState<SemesterFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, error: queryError, refetch } = useQuery({
    queryKey: ["semesters"],
    queryFn: async () => (await api.get<{ data: Semester[] }>("/semesters")).data.data,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["semesters"] });
    queryClient.invalidateQueries({ queryKey: ["stats"] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = { name: form.name.trim(), startDate: form.startDate, endDate: form.endDate };
      if (modal?.mode === "edit") {
        await api.patch(`/semesters/${modal.semester.id}`, body);
      } else {
        await api.post("/semesters", body);
      }
    },
    onSuccess: () => {
      setModal(null);
      invalidate();
    },
    onError: (err) => setError(apiErrorToMessage(err)),
  });

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/semesters/${id}/activate`);
    },
    onSuccess: invalidate,
    onError: (err) => setError(apiErrorToMessage(err)),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.startDate && form.endDate && form.endDate <= form.startDate) {
      setError("La fecha de fin debe ser posterior a la de inicio");
      return;
    }
    saveMutation.mutate();
  };

  const openCreate = () => {
    setForm(emptyForm);
    setError(null);
    setModal({ mode: "create" });
  };

  const openEdit = (semester: Semester) => {
    setForm({
      name: semester.name,
      startDate: toDateInput(semester.startDate),
      endDate: toDateInput(semester.endDate),
    });
    setError(null);
    setModal({ mode: "edit", semester });
  };

  const semesters = data ?? [];
  const inputClass =
    "w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";
  const labelClass = "mb-1 block text-sm font-medium text-gray-700";

  if (isLoading) {
    return <p className="text-sm text-gray-500">Cargando semestres...</p>;
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
          Nuevo semestre
        </button>
      </div>

      {semesters.length === 0 ? (
        <p className="text-sm text-gray-500">Sin semestres cargados.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-700">
                <th className="px-4 py-2 font-semibold">Nombre</th>
                <th className="px-4 py-2 font-semibold">Inicio</th>
                <th className="px-4 py-2 font-semibold">Fin</th>
                <th className="px-4 py-2 font-semibold">Estado</th>
                <th className="px-4 py-2 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {semesters.map((semester) => (
                <tr key={semester.id} className="border-b border-gray-100">
                  <td className="px-4 py-2 font-medium text-gray-900">{semester.name}</td>
                  <td className="px-4 py-2 text-gray-700">
                    {new Date(semester.startDate).toLocaleDateString("es-AR")}
                  </td>
                  <td className="px-4 py-2 text-gray-700">
                    {new Date(semester.endDate).toLocaleDateString("es-AR")}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        semester.isActive
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {semester.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(semester)}
                        className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Editar
                      </button>
                      {!semester.isActive && (
                        <button
                          onClick={() => activateMutation.mutate(semester.id)}
                          disabled={activateMutation.isPending}
                          className="rounded bg-emerald-600 px-2 py-1 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          Activar
                        </button>
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
          title={modal.mode === "edit" ? "Editar semestre" : "Nuevo semestre"}
          onClose={() => setModal(null)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>Nombre</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass}
                maxLength={20}
                placeholder="2026-B"
                required
              />
            </div>
            <div>
              <label className={labelClass}>Fecha de inicio</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Fecha de fin</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className={inputClass}
                required
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
    </div>
  );
}
