import { useQuery } from "@tanstack/react-query";
import { api, apiErrorToMessage } from "../lib/api";
import { RequireAuth } from "../lib/auth";
import { CLASSROOM_TYPE_LABELS } from "../lib/constants";
import type { Classroom, Semester } from "../lib/types";
import AnnotationPanel from "./AnnotationPanel";
import AppProviders from "./AppProviders";
import Navbar from "./Navbar";
import TimetableGrid from "./TimetableGrid";

interface ClassroomDetailPageProps {
  classroomId: string;
}

function ClassroomDetailInner({ classroomId }: ClassroomDetailPageProps) {
  const classroomsQuery = useQuery({
    queryKey: ["classrooms"],
    queryFn: async () => (await api.get<{ classrooms: Classroom[] }>("/classrooms")).data.classrooms,
  });

  const semestersQuery = useQuery({
    queryKey: ["semesters"],
    queryFn: async () => (await api.get<{ semesters: Semester[] }>("/semesters")).data.semesters,
  });

  if (classroomsQuery.isLoading || semestersQuery.isLoading) {
    return <p className="text-sm text-gray-500">Cargando...</p>;
  }

  const error = classroomsQuery.error ?? semestersQuery.error;
  if (error) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {apiErrorToMessage(error)}
      </div>
    );
  }

  const classroom = classroomsQuery.data?.find((c) => c.id === classroomId);
  if (!classroom) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
        Aula no encontrada.{" "}
        <a href="/aulas" className="text-blue-600 underline">
          Volver a aulas
        </a>
      </div>
    );
  }

  const activeSemester = semestersQuery.data?.find((s) => s.isActive) ?? null;

  return (
    <>
      <a href="/aulas" className="text-sm text-blue-600 underline">
        &larr; Volver a aulas
      </a>

      <div className="mt-3 mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <h1 className="text-xl font-bold text-gray-900">
          {classroom.code} - {classroom.name}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          {CLASSROOM_TYPE_LABELS[classroom.type]}
          {classroom.capacity != null ? ` · Capacidad: ${classroom.capacity}` : ""}
          {classroom.location ? ` · ${classroom.location}` : ""}
        </p>
      </div>

      {activeSemester ? (
        <>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Horario semanal</h2>
            <span className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
              Semestre {activeSemester.name}
            </span>
          </div>
          <TimetableGrid classroomId={classroomId} semesterId={activeSemester.id} />
        </>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-600">
          No hay un semestre activo. El encargado debe activar un semestre para ver el horario.
        </div>
      )}

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Bitácora de anotaciones</h2>
        <AnnotationPanel classroomId={classroomId} />
      </div>
    </>
  );
}

export default function ClassroomDetailPage({ classroomId }: ClassroomDetailPageProps) {
  return (
    <AppProviders>
      <RequireAuth>
        <Navbar />
        <main className="mx-auto max-w-7xl p-6">
          <ClassroomDetailInner classroomId={classroomId} />
        </main>
      </RequireAuth>
    </AppProviders>
  );
}
