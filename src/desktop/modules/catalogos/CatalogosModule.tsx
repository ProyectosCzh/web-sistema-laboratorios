import { useState } from "react";
import { BookOpen, Clock, GraduationCap, Library } from "lucide-react";
import type { ModuleProps } from "../../system/moduleTypes";
import SubjectsModule from "./SubjectsModule";
import TeachersModule from "./TeachersModule";
import TimeSlotsModule from "./TimeSlotsModule";

const TABS = [
  { id: "materias", label: "Materias", icon: BookOpen, Component: SubjectsModule },
  { id: "docentes", label: "Docentes", icon: GraduationCap, Component: TeachersModule },
  { id: "horarios", label: "Horarios", icon: Clock, Component: TimeSlotsModule },
] as const;

export default function CatalogosModule(_props: ModuleProps) {
  const [activeTab, setActiveTab] = useState<string>(TABS[0].id);
  const active = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  return (
    <div className="scroll-thin flex h-full min-h-0 flex-col gap-3 overflow-hidden p-4">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-bold tracking-wide text-slate-700 uppercase">
          <Library size={16} className="text-indigo-500" /> Catálogos
        </h2>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Gestione las materias, docentes y bloques horarios del sistema.
        </p>
      </div>

      <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="scroll-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <active.Component params={{}} winId="" embedded />
      </div>
    </div>
  );
}
