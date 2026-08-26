export interface ModuleInstance {
  id: string;           // moduleId (e.g. "tabla-semanal")
  params: Record<string, unknown>;  // parameters passed to the module
  order: number;        // opening order (for tab ordering)
}
