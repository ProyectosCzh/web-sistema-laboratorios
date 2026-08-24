export function requiredText(value: string | null | undefined): string | null {
  return value && value.trim().length > 0 ? null : "Campo obligatorio.";
}

export function emailValid(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function emailError(value: string): string | null {
  const missing = requiredText(value);
  if (missing) return missing;
  return emailValid(value) ? null : "Formato de correo inválido.";
}

export function minLengthError(value: string, min: number): string | null {
  const missing = requiredText(value);
  if (missing) return missing;
  return value.trim().length >= min ? null : `Debe tener al menos ${min} caracteres.`;
}

export function parseCapacity(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

export function capacityError(value: string): string | null {
  if (!value.trim()) return null;
  return parseCapacity(value) === null ? "Capacidad debe ser un entero positivo." : null;
}

export function dateOrderError(startDate: string, endDate: string): string | null {
  if (!startDate || !endDate) return null;
  return startDate <= endDate ? null : "La fecha fin debe ser posterior a la fecha inicio.";
}

export function timeOrderError(startTime: string, endTime: string): string | null {
  if (!startTime || !endTime) return null;
  return startTime < endTime ? null : "La hora fin debe ser posterior a la hora inicio.";
}

export function firstError(errors: Record<string, string | null>): string | null {
  for (const key of Object.keys(errors)) {
    const value = errors[key];
    if (value) return value;
  }
  return null;
}
