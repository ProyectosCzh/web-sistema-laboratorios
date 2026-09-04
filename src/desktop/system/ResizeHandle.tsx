import type { MouseEvent } from "react";

interface ResizeHandleProps {
  onMouseDown: (e: MouseEvent<HTMLDivElement>) => void;
  ariaLabel?: string;
  /** Orientation for accessibility; vertical is default. Horizontal reserved for future use. */
  orientation?: "vertical" | "horizontal";
}

export function ResizeHandle({
  onMouseDown,
  ariaLabel = "Redimensionar panel",
  orientation = "vertical",
}: ResizeHandleProps) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      aria-label={ariaLabel}
      className="resize-handle"
      onMouseDown={onMouseDown}
      tabIndex={0}
      onKeyDown={(e) => {
        // Keyboard accessibility: ignore, resize via mouse only for now
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
        }
      }}
    />
  );
}
