import type { ModuleProps } from "../../system/moduleTypes";
import { CalendarCheck } from "lucide-react";
import { ReservationsPanel } from "./ReservationsPanel";

export default function SupervisionReservasModule(_props: ModuleProps) {
  return (
    <div className="scroll-thin flex h-full min-h-0 flex-col gap-3 overflow-hidden p-4">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-bold tracking-wide text-slate-700 uppercase">
          <CalendarCheck size={16} className="text-sky-700" /> Supervisión de reservas
        </h2>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Confirme solicitudes pendientes, modifique o cancele reservas activas y elimine registros
          cancelados.
        </p>
      </div>
      <ReservationsPanel />
    </div>
  );
}
