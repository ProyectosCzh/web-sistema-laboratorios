import { StickyNote, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { apiErrorToMessage } from "../../../lib/errors";
import { fmtDate } from "../../../lib/format";
import { useClassroomListForPick } from "../../../lib/queries/classrooms";
import {
  useAnnotationMutations,
  useAnnotationsQuery,
} from "../../../lib/queries/annotations";
import type { Annotation } from "../../../lib/types";
import { useAuth } from "../../system/AuthContext";
import { useConfirm } from "../../system/DialogHost";
import { useToast } from "../../system/ToastProvider";
import { DataTable, type Column } from "../../ui/DataTable";
import { SelectInput } from "../../ui/Field";
import { Pagination } from "../../ui/Pagination";

export function AnnotationsList() {
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const isEncargado = user.role === "ENCARGADO";

  const classrooms = useClassroomListForPick(true);
  const { remove } = useAnnotationMutations();

  const [listClassroomId, setListClassroomId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  const classroomById = useMemo(() => {
    const map = new Map<string, { code: string; name: string }>();
    for (const c of classrooms.data?.data ?? []) map.set(c.id, c);
    return map;
  }, [classrooms.data]);

  const query = useAnnotationsQuery({
    page,
    pageSize: PAGE_SIZE,
    classroomId: listClassroomId || undefined,
    from: from || undefined,
    to: to || undefined,
  });

  const removeOne = async (a: Annotation) => {
    const ok = await confirm({
      title: "Eliminar anotación",
      message: "¿Eliminar esta anotación del historial?",
      danger: true,
      confirmText: "Eliminar",
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(a.id);
      toast.success("Anotación eliminada.");
    } catch (err) {
      toast.error(apiErrorToMessage(err));
    }
  };

  const columns: Column<Annotation>[] = [
    {
      key: "date",
      header: "Fecha",
      render: (a) => <span className="text-xs whitespace-nowrap">{fmtDate(a.date)}</span>,
    },
    {
      key: "classroom",
      header: "Aula",
      render: (a) => {
        const found = classroomById.get(a.classroomId);
        return (
          <span
            title={found ? `${found.code} · ${found.name}` : a.classroomId}
            className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-bold text-slate-700"
          >
            {found?.code ?? a.classroomId}
          </span>
        );
      },
    },
    {
      key: "user",
      header: "Registró",
      headerClass: "hidden md:table-cell",
      cellClass: "hidden md:table-cell",
      render: (a) => <span className="text-xs">{a.user.name}</span>,
    },
    {
      key: "content",
      header: "Observación",
      cellClass: "max-w-md",
      render: (a) => (
        <span title={a.content} className="line-clamp-2 text-xs text-slate-700">
          {a.content}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      headerClass: "w-12 text-right",
      cellClass: "text-right",
      render: (a) =>
        isEncargado || a.userId === user.id ? (
          <button
            type="button"
            title="Eliminar"
            className="btn btn-ghost btn-sm hover:bg-rose-50 hover:text-rose-600"
            onClick={() => void removeOne(a)}
          >
            <Trash2 size={13} />
          </button>
        ) : null,
    },
  ];

  return (
    <div className="scroll-thin flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-44">
          <SelectInput
            options={(classrooms.data?.data ?? []).map((c) => ({
              value: c.id,
              label: `${c.code} · ${c.name}`,
            }))}
            placeholder="Seleccione aula…"
            value={listClassroomId}
            onChange={(e) => {
              setListClassroomId(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="w-36">
          <input
            type="date"
            aria-label="Desde"
            className="input-base"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="w-36">
          <input
            type="date"
            aria-label="Hasta"
            className="input-base"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={query.data?.data}
        rowKey={(a) => a.id}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        emptyIcon={StickyNote}
        emptyMessage="Sin anotaciones registradas."
      />

      {query.data && query.data.meta.totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={query.data.meta.totalPages}
          total={query.data.meta.total}
          onPage={setPage}
        />
      )}
    </div>
  );
}
