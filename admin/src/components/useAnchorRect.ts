import { useCallback, useLayoutEffect, useState, type RefObject } from "react";

export type AnchorRect = { top: number; left: number; bottom: number; width: number };

/**
 * Tracks an anchor element's viewport rect while `open`, updating on scroll/resize.
 * Used to position portal-rendered dropdown menus (which must live on <body> to
 * escape the glass cards' backdrop-filter stacking contexts).
 */
export function useAnchorRect(anchorRef: RefObject<HTMLElement | null>, open: boolean): AnchorRect | null {
  const [rect, setRect] = useState<AnchorRect | null>(null);

  const update = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, bottom: r.bottom, width: r.width });
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (!open) return;
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, update]);

  return open ? rect : null;
}

/** Clamp a left position so a `menuWidth`-wide menu stays within the viewport. */
export function clampLeft(left: number, menuWidth = 280, pad = 8): number {
  return Math.max(pad, Math.min(left, window.innerWidth - menuWidth - pad));
}
