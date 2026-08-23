import type { ModuleProps } from "../../system/moduleTypes";
import { CalendarRange, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, type SyntheticEvent } from "react";
import { DAY_NAMES, DAY_SHORT, WORKING_DAYS_ALL } from "../../../lib/constants";
import { apiErrorToMessage } from "../../../lib/errors";
import { fmtDate } from "../../../lib/format";
import {
  useSemesterMutations,
  useSemestersQuery,
} from "../../../lib/queries/semesters";
import type { Semester } from "../../../lib/types";
import {
  dateOrderError,
  minLengthError,
  requiredText,
} from "../../../lib/validation";
import { useConfirm } from "../../system/DialogHost";
import { useToast } from "../../system/ToastProvider";
import { Badge } from "../../ui/Badge";
import { DataTable, type Column } from "../../ui/DataTable";
import { Field, TextInput } from "../../ui/Field";
import { Modal } from "../../ui/Modal";

interface WizardState {
  name: string;
  startDate: string;
  endDate: string;
  days: number[];
}

const INITIAL_WIZARD: WizardState = {
  name: "",
  startDate: "",
  endDate: "",
  days: [1, 2, 3, 4, 5],
};

export default function SemestersModule(_props: ModuleProps) {
  const toast = useToast();
  const confirm = useConfirm();

  const query = useSemestersQuery({ page: 1, pageSize: 50 });
  const { create, update, activate, remove } = useSemesterMutations();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizard, setWizard] = useState<WizardState>(INITIAL_WIZARD);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const [editTarget, setEditTarget] = useState<Semester | null>(null);

  const openWizard = () => {
    setWizard(INITIAL_WIZARD);
    setWizardStep(1);
    setErrors({});
    setWizardOpen(true);
  };

  const validateStep = (): boolean => {
    if (wizardStep === 1) {
      const next = {
        name: minLengthError(wizard.name, 3),
        startDate: requiredText(wizard.startDate),
        endDate: dateOrderError(wizard.startDate, wizard.endDate),
      };
      setErrors(next);
      return Object.values(next).every((v) => !v);
    }
    if (wizardStep === 2) {
      const next = { days: wizard.days.length > 0 ? null : "Seleccione al menos un día hábil." };
      setErrors(next);
      return Object.values(next).every((v) => !v);
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep()) return;
    setWizardStep((s) => Math.min(s + 1, 3));
  };

  const publish = async () => {
    try {
      const created = await create.mutateAsync({
        name: wizard.name.trim(),
        startDate: wizard.startDate,
        endDate: wizard.endDate,
        workingDays: [...wizard.days].sort(),
      });
      await activate.mutateAsync(created.id);
      toast.success(`Semestre ${created.name} publicado y activado.`);
      setWizardOpen(false);
    } catch (err) {
      toast.error(apiErrorToMessage(err));
    }
  };

  const submitEdit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editTarget) return;
    const next = {
      name: minLengthError(editTarget.name, 3),
      endDate: dateOrderError(editTarget.startDate, editTarget.endDate),
    };
    setErrors(next);
    if (Object.values(next).some((v) => v)) return;
    try {
      await update.mutateAsync({
        id: editTarget.id,
        input: {
          name: editTarget.name.trim(),
          startDate: editTarget.startDate,
          endDate: editTarget.endDate,
          workingDays: editTarget.workingDays,
        },
      });
      toast.success("Semestre actualizado.");
      setEditTarget(null);
    } catch (err) {
      toast.error(apiErrorToMessage(err));
    }
  };

  const activateOne = async (semester: Semester) => {
    const ok = await confirm({
      title: "Activar semestre",
      message: `Se activará ${semester.name}. El semestre activo actual se desactivará automáticamente.`,
      confirmText: "Activar",
    });
    if (!ok) return;
    try {
      await activate.mutateAsync(semester.id);
      toast.success(`${semester.name} es ahora el semestre activo.`);
    } catch (err) {
      toast.error(apiErrorToMessage(err));
    }
  };

  const removeSemester = async (semester: Semester) => {
    const ok = await confirm({
      title: "Eliminar semestre",
      message: `¿Eliminar ${semester.name}? Será rechazado si tiene horarios o reservas asociadas.`,
      danger: true,
      confirmText: "Eliminar",
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(semester.id);
      toast.success("Semestre eliminado.");
    } catch (err) {
      toast.error(apiErrorToMessage(err));
    }
  };

  const columns: Column<Semester>[] = [
    {
      key: "name",
      header: "Semestre",
      render: (s) => (
        <span className="text-xs font-bold text-slate-800">{s.name}</span>
      ),
    },
    {
      key: "period",
      header: "Período",
      render: (s) => (
        <span className="text-xs whitespace-nowrap text-slate-600">
          {fmtDate(s.startDate)} — {fmtDate(s.endDate)}
        </span>
      ),
    },
    {
      key: "days",
      header: "Días hábiles",
      headerClass: "hidden md:table-cell",
      cellClass: "hidden md:table-cell",
      render: (s) => (
        <span className="text-xs text-slate-600">
          {[...s.workingDays]
            .sort((a, b) => a - b)
            .map((d) => DAY_SHORT[d] ?? d)
            .join(" · ")}
        </span>
      ),
    },
    {
      key: "active",
      header: "Estado",
      render: (s) =>
        s.isActive ? (
          <Badge tone="success" dot>
            Activo
          </Badge>
        ) : (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => void activateOne(s)}
          >
            Activar
          </button>
        ),
    },
    {
      key: "actions",
      header: "Acciones",
      headerClass: "text-right w-28",
      cellClass: "text-right",
      render: (s) => (
        <div className="flex justify-end gap-1">
          <button
            type="button"
            title="Editar"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setEditTarget({ ...s });
              setErrors({});
            }}
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            title="Eliminar"
            className="btn btn-ghost btn-sm hover:bg-rose-50 hover:text-rose-600"
            onClick={() => void removeSemester(s)}
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="scroll-thin flex h-full min-h-0 flex-col gap-3 overflow-hidden p-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold tracking-wide text-slate-700 uppercase">
          <CalendarRange size={16} className="text-sky-700" /> Semestres académicos
        </h2>
        <button type="button" className="btn btn-primary btn-sm" onClick={openWizard}>
          <Plus size={13} /> Nuevo semestre (asistente)
        </button>
      </div>

      <DataTable
        columns={columns}
        data={query.data?.data}
        rowKey={(s) => s.id}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        emptyIcon={CalendarRange}
        emptyMessage="Sin semestres configurados."
      />

      <Modal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        title={`Asistente de semestre · Paso ${wizardStep} de 3`}
        widthClass="max-w-lg"
        footer={
          <>
            {wizardStep > 1 && (
              <button type="button" className="btn btn-secondary" onClick={() => setWizardStep((s) => s - 1)}>
                Atrás
              </button>
            )}
            {wizardStep < 3 ? (
              <button type="button" className="btn btn-primary" onClick={goNext}>
                Siguiente
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                disabled={create.isPending || activate.isPending}
                onClick={() => void publish()}
              >
                Publicar calendario
              </button>
            )}
          </>
        }
      >
        <ol className="mb-4 flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase">
          {["Datos", "Días hábiles", "Publicar"].map((label, i) => (
            <li
              key={label}
              className={`flex-1 rounded-md px-2 py-1 text-center ${
                wizardStep === i + 1
                  ? "bg-sky-700 text-white"
                  : wizardStep > i + 1
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-400"
              }`}
            >
              {i + 1}. {label}
            </li>
          ))}
        </ol>

        {wizardStep === 1 && (
          <div className="space-y-3.5">
            <Field label="Nombre del semestre" error={errors.name} required hint="Ej.: 2026-A">
              <TextInput
                value={wizard.name}
                onChange={(e) => setWizard((w) => ({ ...w, name: e.target.value }))}
                placeholder="2026-B"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha inicio" error={errors.startDate ?? undefined} required>
                <TextInput
                  type="date"
                  value={wizard.startDate}
                  onChange={(e) => setWizard((w) => ({ ...w, startDate: e.target.value }))}
                />
              </Field>
              <Field label="Fecha fin" error={errors.endDate ?? undefined} required>
                <TextInput
                  type="date"
                  value={wizard.endDate}
                  onChange={(e) => setWizard((w) => ({ ...w, endDate: e.target.value }))}
                />
              </Field>
            </div>
          </div>
        )}

        {wizardStep === 2 && (
          <div>
            <p className="label-base">Días de la semana hábiles</p>
            <div className="grid grid-cols-6 gap-2">
              {WORKING_DAYS_ALL.map((day) => {
                const checked = wizard.days.includes(day);
                return (
                  <label
                    key={day}
                    className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-xs font-semibold transition-colors ${
                      checked
                        ? "border-sky-500 bg-sky-50 text-sky-800"
                        : "border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() =>
                        setWizard((w) => ({
                          ...w,
                          days: checked
                            ? w.days.filter((d) => d !== day)
                            : [...w.days, day],
                        }))
                      }
                    />
                    <span>{DAY_NAMES[day]}</span>
                    <span className={`h-2 w-2 rounded-full ${checked ? "bg-sky-600" : "bg-slate-300"}`} />
                  </label>
                );
              })}
            </div>
            {errors.days && <p className="field-error">{errors.days}</p>}
            <p className="mt-3 text-[11px] text-slate-400">
              Los bloques horarios oficiales se gestionan en el módulo “Bloques horarios” y son comunes a todos los semestres.
            </p>
          </div>
        )}

        {wizardStep === 3 && (
          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
            <p><strong>Semestre:</strong> {wizard.name || "—"}</p>
            <p>
              <strong>Período:</strong> {fmtDate(wizard.startDate)} — {fmtDate(wizard.endDate)}
            </p>
            <p>
              <strong>Días hábiles:</strong>{" "}
              {wizard.days.sort((a, b) => a - b).map((d) => DAY_SHORT[d]).join(" · ") || "—"}
            </p>
            <p className="pt-1 text-[11px] text-slate-500">
              Al publicar, el semestre quedará activo y la Tabla Semanal se generará con esta configuración.
            </p>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        title={`Editar semestre · ${editTarget?.name ?? ""}`}
        widthClass="max-w-lg"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setEditTarget(null)}>
              Cancelar
            </button>
            <button
              type="submit"
              form="semester-edit-form"
              className="btn btn-primary"
              disabled={update.isPending}
            >
              Guardar cambios
            </button>
          </>
        }
      >
        {editTarget && (
          <form id="semester-edit-form" onSubmit={(e) => void submitEdit(e)} className="space-y-3.5" noValidate>
            <Field label="Nombre" error={errors.name ?? undefined} required>
              <TextInput
                value={editTarget.name}
                onChange={(e) => setEditTarget((s) => (s ? { ...s, name: e.target.value } : s))}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha inicio">
                <TextInput
                  type="date"
                  value={editTarget.startDate.slice(0, 10)}
                  onChange={(e) =>
                    setEditTarget((s) => (s ? { ...s, startDate: e.target.value } : s))
                  }
                />
              </Field>
              <Field label="Fecha fin" error={errors.endDate ?? undefined}>
                <TextInput
                  type="date"
                  value={editTarget.endDate.slice(0, 10)}
                  onChange={(e) =>
                    setEditTarget((s) => (s ? { ...s, endDate: e.target.value } : s))
                  }
                />
              </Field>
            </div>
            <div>
              <p className="label-base">Días hábiles</p>
              <div className="flex flex-wrap gap-1.5">
                {WORKING_DAYS_ALL.map((day) => {
                  const checked = editTarget.workingDays.includes(day);
                  return (
                    <button
                      type="button"
                      key={day}
                      onClick={() =>
                        setEditTarget((s) =>
                          s
                            ? {
                                ...s,
                                workingDays: checked
                                  ? s.workingDays.filter((d) => d !== day)
                                  : [...s.workingDays, day],
                              }
                            : s,
                        )
                      }
                      className={`btn btn-sm ${checked ? "btn-primary" : "btn-secondary"}`}
                    >
                      {DAY_SHORT[day]}
                    </button>
                  );
                })}
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
