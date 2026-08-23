import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent, type ChangeEvent } from "react";
import { api, apiErrorToMessage } from "../lib/api";
import { COURSE_OFFERING_TYPES, COURSE_OFFERING_TYPE_LABELS } from "../lib/constants";
import type { CourseOffering, CourseOfferingType, Semester, Subject, Teacher } from "../lib/types";
import Modal from "./Modal";

interface CourseOfferingFormState {
  semesterId: string;
  subjectId: string;
  section: string;
  teacherId: string;
  type: CourseOfferingType;
  note: string;
  active: boolean;
}

const emptyForm: CourseOfferingFormState = {
  semesterId: "",
  subjectId: "",
  section: "",
  teacherId: "",
  type: "CLASE",
  note: "",
  active: true,
};

export default function CourseOfferingsPanel() {
  const queryClient = useQueryClient();

  const [modal, setModal] = useState<{ mode: "create" } | { mode: "edit"; offering: CourseOffering } | null>(null);
  const [form, setForm] = useState<CourseOfferingFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [filterSemesterId, setFilterSemesterId] = useState<string>("");

  const semestersQuery = useQuery({
    queryKey: ["semesters"],
    queryFn: async () => (await api.get<{ semesters: Semester[] }>("/semesters")).data.semesters,
  });

  const subjectsQuery = useQuery({
    queryKey: ["subjects", true],
    queryFn: async () =>
      (
        await api.get<{ subjects: Subject[] }>("/subjects", {
          params: { includeInactive: true },
        })
      ).data.subjects,
  });

  const teachersQuery = useQuery({
    queryKey: ["teachers", true],
    queryFn: async () =>
      (
        await api.get<{ teachers: Teacher[] }>("/teachers", {
          params: { includeInactive: true },
        })
      ).data.teachers,
  });

  const offeringsQuery = useQuery({
    queryKey: ["course-offerings", filterSemesterId, includeInactive],
    queryFn: async () =>
      (
        await api.get<{ offerings: CourseOffering[] }>("/course-offerings", {
          params: {
            semesterId: filterSemesterId,
            includeInactive,
          },
        })
      ).data.offerings,
    enabled: !!filterSemesterId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["course-offerings"] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        semesterId: form.semesterId,
        subjectId: form.subjectId,
        section: form.section.trim().toUpperCase(),
        teacherId: form.teacherId || null,
        type: form.type,
        note: form.note.trim() || null,
        active: form.active,
      };
      if (modal?.mode === "edit") {
        await api.patch(`/course-offerings/${modal.offering.id}`, body);
      } else {
        await api.post("/course-offerings", body);
      }
    },
    onSuccess: () => {
      setModal(null);
      invalidate();
    },
    onError: (err) => setError(apiErrorToMessage(err)),
  });

  const handleSemesterChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const semesterId = e.target.value;
    setForm((prev) => ({ ...prev, semesterId, subjectId: "", teacherId: "" }));
    setFilterSemesterId(semesterId);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.semesterId || !form.subjectId || !form.section.trim()) {
      setError("Semestre, materia y sección son obligatorios");
      return;
    }
    saveMutation.mutate();
  };

  const openCreate = () => {
    setForm(emptyForm);
    setError(null);
    setModal({ mode: "create" });
  };

  const openEdit = (offering: CourseOffering) => {
    setForm({
      semesterId: offering.semesterId,
      subjectId: offering.subject.id,
      section: offering.section,
      teacherId: offering.teacher?.id ?? "",
      type: offering.type,
      note: offering.note ?? "",
      active: offering.active,
    });
    setFilterSemesterId(offering.semesterId);
    setError(null);
    setModal({ mode: "edit", offering });
  };

  const semesters = semestersQuery.data ?? [];
  const subjects = subjectsQuery.data ?? [];
  const teachers = teachersQuery.data ?? [];
  const offerings = offeringsQuery.data ?? [];

  const activeSemester = semesters.find((s) => s.isActive);
  const defaultSemesterId = filterSemesterId || activeSemester?.id || "";

  const inputClass =
    "w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";
  const labelClass = "mb-1 block text-sm font-medium text-gray-700";

  const isLoading = semestersQuery.isLoading || subjectsQuery.isLoading || teachersQuery.isLoading;

  if (isLoading) {
    return <p className="text-sm text-gray-500">Cargando datos...</p>;
  }

  if (semestersQuery.isError || subjectsQuery.isError || teachersQuery.isError) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p>Error cargando catálogos</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-700">Semestre:</label>
          <select
            value={defaultSemesterId}
            onChange={handleSemesterChange}
            className={inputClass}
            style={{ minWidth: "200px" }}
          >
            <option value="">Seleccioná un semestre</option>
            {semesters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.isActive ? "(activo)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={openCreate} disabled={!defaultSemesterId} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            Nueva comisión
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
      </div>

      {!defaultSemesterId ? (
        <p className="text-sm text-gray-500">Seleccioná un semestre para ver y crear comisiones.</p>
      ) : offerings.length === 0 ? (
        <p className="text-sm text-gray-500">Sin comisiones en este semestre.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-700">
                <th className="px-4 py-2 font-semibold">Materia</th>
                <th className="px-4 py-2 font-semibold">Sección</th>
                <th className="px-4 py-2 font-semibold">Tipo</th>
                <th className="px-4 py-2 font-semibold">Docente</th>
                <th className="px-4 py-2 font-semibold">Estado</th>
                <th className="px-4 py-2 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {offerings.map((offering) => (
                <tr key={offering.id} className="border-b border-gray-100">
                  <td className="px-4 py-2 text-gray-700">
                    <span className="font-medium">{offering.subject.code}</span> - {offering.subject.name}
                  </td>
                  <td className="px-4 py-2 font-medium text-gray-900">{offering.section}</td>
                  <td className="px-4 py-2">
                    <span className="rounded px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
                      {COURSE_OFFERING_TYPE_LABELS[offering.type]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-700">
                    {offering.teacher ? `${offering.teacher.code} - ${offering.teacher.name}` : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        offering.active ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {offering.active ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(offering)}
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
        <Modal title={modal.mode === "edit" ? "Editar comisión" : "Nueva comisión"} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>Semestre</label>
              <select
                value={form.semesterId}
                onChange={(e) => setForm({ ...form, semesterId: e.target.value, subjectId: "", teacherId: "" })}
                className={inputClass}
                disabled={modal.mode === "edit"}
                required
              >
                <option value="">Seleccioná un semestre</option>
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.isActive ? "(activo)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Materia</label>
              <select
                value={form.subjectId}
                onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
                className={inputClass}
                required
              >
                <option value="">Seleccioná una materia</option>
                {subjects.filter((s) => s.active).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Sección</label>
              <input
                value={form.section}
                onChange={(e) => setForm({ ...form, section: e.target.value.toUpperCase() })}
                className={inputClass}
                maxLength={20}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Docente (opcional)</label>
              <select
                value={form.teacherId}
                onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
                className={inputClass}
              >
                <option value="">Sin docente asignado</option>
                {teachers.filter((t) => t.active).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.code} - {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Tipo</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as CourseOfferingType })}
                className={inputClass}
              >
                {COURSE_OFFERING_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {COURSE_OFFERING_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Nota (opcional)</label>
              <textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                className={inputClass}
                rows={2}
                maxLength={500}
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
                disabled={saveMutation.isPending || !form.semesterId}
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