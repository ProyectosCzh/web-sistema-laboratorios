import type { ReactNode } from "react";
import { apiErrorToMessage } from "../../lib/errors";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "./States";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  headerClass?: string;
  cellClass?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[] | undefined;
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  emptyMessage?: string;
  emptyIcon?: Parameters<typeof EmptyBlock>[0]["icon"];
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  loading,
  error,
  onRetry,
  emptyMessage,
  emptyIcon,
  onRowClick,
}: DataTableProps<T>) {
  if (error && !data) {
    return <ErrorBlock error={error} onRetry={onRetry} />;
  }
  if (loading && !data) {
    return <LoadingBlock />;
  }
  if (!data || data.length === 0) {
    return <EmptyBlock message={emptyMessage} icon={emptyIcon} />;
  }

  return (
    <div className="scroll-thin max-h-full overflow-auto rounded-lg border border-slate-200">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.headerClass}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={onRowClick ? "cursor-pointer" : undefined}
            >
              {columns.map((col) => (
                <td key={col.key} className={col.cellClass}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function tableErrorText(error: unknown): string {
  return apiErrorToMessage(error);
}
