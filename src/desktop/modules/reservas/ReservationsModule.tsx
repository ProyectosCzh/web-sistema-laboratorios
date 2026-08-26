import { useState } from "react";
import { CalendarCheck, ClipboardList, StickyNote } from "lucide-react";
import { useAuth } from "../../system/AuthContext";
import type { ModuleProps } from "../../system/moduleTypes";
import AnnotationsSection from "./AnnotationsSection";
import { ReservationsPanel } from "./ReservationsPanel";

export default function ReservationsModule(_props: ModuleProps) {
  const { user } = useAuth();
  const isEncargado = user.role === "ENCARGADO";
  const [activeTab, setActiveTab] = useState<string>("reservas");

  return (
    <div className="scroll-thin flex h-full min-h-0 flex-col gap-3 overflow-hidden p-4">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-bold tracking-wide text-slate-700 uppercase">
          {isEncargado ? (
            <>
              <CalendarCheck size={16} className="text-sky-700" /> Supervisión de reservas
            </>
          ) : (
            <>
              <ClipboardList size={16} className="text-sky-700" /> Mis reservas
            </>
          )}
        </h2>
        <p className="mt-0.5 text-[11px] text-slate-500">
          {isEncargado
            ? "Confirme solicitudes pendientes, modifique o cancele reservas activas y elimine registros cancelados."
            : "Puede modificar o cancelar sus reservas mientras estén pendientes de confirmación."}
        </p>
      </div>

      {!isEncargado && (
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "reservas"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => setActiveTab("reservas")}
          >
            <ClipboardList size={13} /> Mis Reservas
          </button>
          <button
            type="button"
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "anotaciones"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => setActiveTab("anotaciones")}
          >
            <StickyNote size={13} /> Anotaciones
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-hidden">
        {isEncargado ? <ReservationsPanel /> : activeTab === "reservas" ? <ReservationsPanel /> : <AnnotationsSection />}
      </div>
    </div>
  );
}
