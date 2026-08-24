import type { ModuleProps } from "../../system/moduleTypes";
import { ClipboardList } from "lucide-react";
import { ReservationsPanel } from "./ReservationsPanel";

export default function MyReservationsModule(_props: ModuleProps) {
  return (
    <div className="scroll-thin flex h-full min-h-0 flex-col gap-3 overflow-hidden p-4">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-bold tracking-wide text-slate-700 uppercase">
          <ClipboardList size={16} className="text-sky-700" /> Mis reservas
        </h2>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Puede modificar o cancelar sus reservas mientras estén pendientes de confirmación.
        </p>
      </div>
      <ReservationsPanel showNewButton />
    </div>
  );
}
