export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowInstance extends Rect {
  id: string;
  moduleId: string;
  title: string;
  z: number;
  minimized: boolean;
  maximized: boolean;
  restoreRect: Rect | null;
  params: Record<string, unknown>;
}

export const TASKBAR_HEIGHT = 48;

export const WINDOW_MIN_WIDTH = 380;
export const WINDOW_MIN_HEIGHT = 260;

export function computeResize(
  dir: string,
  dx: number,
  dy: number,
  rect: Rect,
  areaW: number,
  areaH: number,
): Rect {
  let { x, y, width, height } = rect;
  if (dir.includes("e")) {
    width = Math.min(Math.max(rect.width + dx, WINDOW_MIN_WIDTH), areaW - x);
  }
  if (dir.includes("s")) {
    height = Math.min(Math.max(rect.height + dy, WINDOW_MIN_HEIGHT), areaH - y);
  }
  if (dir.includes("w")) {
    const nextWidth = Math.min(Math.max(rect.width - dx, WINDOW_MIN_WIDTH), x + rect.width);
    x = x + rect.width - nextWidth;
    width = nextWidth;
  }
  if (dir.includes("n")) {
    const nextHeight = Math.min(Math.max(rect.height - dy, WINDOW_MIN_HEIGHT), y + rect.height);
    y = y + rect.height - nextHeight;
    height = nextHeight;
  }
  return { x, y, width, height };
}
