import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { api, apiErrorToMessage } from "../lib/api";
import { useAuth } from "../lib/auth";
import { canModifyAnnotation } from "../lib/permissions";
import type { Annotation } from "../lib/types";

interface AnnotationPanelProps {
  classroomId: string;
}

export default function AnnotationPanel({ classroomId }: AnnotationPanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, error: queryError, refetch } = useQuery({
    queryKey: ["annotations", classroomId],
    queryFn: async () =>
      (
        await api.get<{ annotations: Annotation[] }>("/annotations", {
          params: { classroomId },
        })
      ).data.annotations,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["annotations", classroomId] });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post("/annotations", { classroomId, content });
    },
    onSuccess: () => {
      setContent("");
      invalidate();
    },
    onError: (err) => setError(apiErrorToMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/annotations/${id}`);
    },
    onSuccess: invalidate,
    onError: (err) => setError(apiErrorToMessage(err)),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!content.trim()) return;
    createMutation.mutate();
  };

  const annotations = data ?? [];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            rows={3}
            placeholder="Escribí una anotación para esta aula..."
            maxLength={1000}
          />
          <div className="mt-2 flex items-center justify-between">
            {error && <span className="text-sm text-red-600">{error}</span>}
            <button
              type="submit"
              disabled={createMutation.isPending || !content.trim()}
              className="ml-auto rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {createMutation.isPending ? "Guardando..." : "Guardar anotación"}
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-2">
        {isLoading && <p className="text-sm text-gray-500">Cargando anotaciones...</p>}
        {isError && (
          <p className="text-sm text-red-600">
            {apiErrorToMessage(queryError)}{" "}
            <button onClick={() => refetch()} className="underline">
              Reintentar
            </button>
          </p>
        )}
        {!isLoading && !isError && annotations.length === 0 && (
          <p className="text-sm text-gray-500">Sin anotaciones por ahora.</p>
        )}
        {annotations.map((annotation) => (
          <div key={annotation.id} className="rounded-lg border border-gray-200 bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-gray-900">{annotation.content}</p>
              {canModifyAnnotation(user, annotation.userId) && (
                <button
                  onClick={() => deleteMutation.mutate(annotation.id)}
                  disabled={deleteMutation.isPending}
                  className="shrink-0 text-sm text-red-600 hover:underline"
                >
                  Eliminar
                </button>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {annotation.user.name} · {new Date(annotation.date).toLocaleString("es-AR")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
