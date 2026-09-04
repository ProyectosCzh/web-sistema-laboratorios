export type PanelLayoutState = { order: string[]; sizes: Record<string, number> };

export const STORAGE_KEY = "labmanage:layout:v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readLayout(): PanelLayoutState {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return { order: [], sizes: {} };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { order: [], sizes: {} };
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return { order: [], sizes: {} };

    const orderRaw = parsed.order;
    const sizesRaw = parsed.sizes;

    const order = Array.isArray(orderRaw)
      ? orderRaw.filter((v): v is string => typeof v === "string")
      : [];

    let sizes: Record<string, number> = {};
    if (isRecord(sizesRaw)) {
      for (const [k, v] of Object.entries(sizesRaw)) {
        if (typeof v === "number" && Number.isFinite(v)) {
          sizes[k] = v;
        }
      }
    }

    return { order, sizes };
  } catch {
    return { order: [], sizes: {} };
  }
}

export function writeLayout(layout: PanelLayoutState): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // quota exceeded or storage disabled — ignore
  }
}

export function sanitizeLayout(
  openIds: string[],
  layout: PanelLayoutState
): PanelLayoutState {
  // Filter order to only openIds, preserving layout.order sequence,
  // appending missing openIds at the end in openIds order.
  const orderSet = new Set(openIds);
  const filteredOrder = layout.order.filter((id) => orderSet.has(id));
  for (const id of openIds) {
    if (!filteredOrder.includes(id)) filteredOrder.push(id);
  }

  // Filter sizes to only openIds
  const filteredSizes: Record<string, number> = {};
  for (const id of openIds) {
    const v = layout.sizes[id];
    if (typeof v === "number" && Number.isFinite(v) && v > 0) {
      filteredSizes[id] = v;
    }
  }

  // Ensure every openId has a size; assign equal share for missing,
  // then normalize to 100 if there are entries.
  if (openIds.length === 0) {
    return { order: [], sizes: {} };
  }

  const missing = openIds.filter((id) => !(id in filteredSizes));
  if (missing.length > 0) {
    if (Object.keys(filteredSizes).length === 0) {
      // No valid sizes at all — equal distribution
      const equal = 100 / openIds.length;
      for (const id of openIds) filteredSizes[id] = equal;
    } else {
      // Assign average for missing while preserving existing, then normalize
      const avg = 100 / openIds.length;
      // If existingSum + missing*avg != 100 due to existingSum not being 100,
      // we distribute remaining proportionally after insertion.
      for (const id of missing) filteredSizes[id] = avg;
      // Normalize to 100 proportionally
      const total = Object.values(filteredSizes).reduce((a, b) => a + b, 0);
      if (total > 0 && Math.abs(total - 100) > 0.01) {
        for (const id of openIds) {
          filteredSizes[id] = (filteredSizes[id] / total) * 100;
        }
      }
    }
  } else {
    // All present — normalize if sum deviates
    const total = Object.values(filteredSizes).reduce((a, b) => a + b, 0);
    if (total > 0 && Math.abs(total - 100) > 0.01) {
      for (const id of openIds) {
        filteredSizes[id] = (filteredSizes[id] / total) * 100;
      }
    }
  }

  return { order: filteredOrder, sizes: filteredSizes };
}
