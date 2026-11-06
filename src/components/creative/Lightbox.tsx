import { useEffect, useLayoutEffect, useRef, type JSX, type KeyboardEvent, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import type { Roll } from "../../data/content";
import { flatNeighbours, nextIndex, type Pos } from "./lightboxNav";
import { frameLabel } from "./rollLayout";

const SWIPE_PX = 40;

const control =
  "fixed z-10 items-center justify-center p-3 font-mono text-xs uppercase tracking-wide text-white/80 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** Accent on the active control only; a control at the very end is dimmed and never turns accent. */
function controlClass(atLimit: boolean): string {
  return `${control} ${atLimit ? "cursor-default opacity-40" : "hover:text-accent focus-visible:text-accent"}`;
}

export default function Lightbox({
  rolls,
  pos,
  onClose,
  onNavigate,
  returnFocusTo,
}: {
  rolls: Roll[];
  pos: Pos | null;
  onClose: () => void;
  onNavigate: (pos: Pos) => void;
  returnFocusTo: HTMLElement | null;
}): JSX.Element | null {
  const open = pos !== null;
  const closeRef = useRef<HTMLButtonElement>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const returnRef = useRef(returnFocusTo);
  // Layout effect: updated before the passive close cleanup below reads it, even in the same commit.
  useLayoutEffect(() => {
    returnRef.current = returnFocusTo;
  }, [returnFocusTo]);
  const downX = useRef<number | null>(null);
  const dragged = useRef(false);

  // Open/close: lock body scroll, focus the close button, return focus on close.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
      returnRef.current?.focus();
    };
  }, [open]);

  // Preload the neighbouring full-size frames.
  const roll = pos?.roll;
  const frameIndex = pos?.frame;
  useEffect(() => {
    if (roll === undefined || frameIndex === undefined) return;
    const { prev, next } = flatNeighbours(rolls, { roll, frame: frameIndex });
    for (const f of [prev, next]) {
      if (f) new Image().src = f.src;
    }
  }, [rolls, roll, frameIndex]);

  if (!pos) return null;
  const frame = rolls[pos.roll].frames[pos.frame];
  const target = (dir: 1 | -1) => nextIndex(rolls, pos, dir);
  const isEnd = (dir: 1 | -1) => {
    const t = target(dir);
    return t.roll === pos.roll && t.frame === pos.frame;
  };
  const atStart = isEnd(-1);
  const atEnd = isEnd(1);
  const go = (dir: 1 | -1) => {
    if (!isEnd(dir)) onNavigate(target(dir));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "Tab") {
      // Focus trap: cycle among the visible controls (prev/next are hidden below 640).
      const buttons = [closeRef.current, prevRef.current, nextRef.current].filter(
        (b): b is HTMLButtonElement => !!b && getComputedStyle(b).display !== "none",
      );
      if (buttons.length === 0) return;
      e.preventDefault();
      const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const step = e.shiftKey ? -1 : 1;
      (i === -1 ? buttons[0] : buttons[(i + step + buttons.length) % buttons.length]).focus();
    }
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    dragged.current = false;
    // A press on a control is a click, not a swipe: capturing it would retarget the click to the dialog.
    if ((e.target as Element).closest("button")) {
      downX.current = null;
      return;
    }
    downX.current = e.clientX;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (downX.current === null) return;
    const dx = e.clientX - downX.current;
    downX.current = null;
    if (Math.abs(dx) >= SWIPE_PX) {
      dragged.current = true;
      go(dx < 0 ? 1 : -1);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/92 opacity-100 transition-opacity duration-200 starting:opacity-0 motion-reduce:transition-none"
      // A touch swipe fires no click, so clear a stale drag on the next press anywhere.
      onPointerDown={() => (dragged.current = false)}
      onClick={(e) => {
        // A click that ends a swipe is not a tap on the backdrop.
        if (dragged.current) {
          dragged.current = false;
          return;
        }
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={frame.alt}
        tabIndex={-1}
        className="touch-pan-y focus:outline-none"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (downX.current = null)}
      >
        <p aria-live="polite" className="fixed left-4 top-4 font-mono text-xs uppercase tracking-wide text-white/80">
          {frameLabel(pos.roll, pos.frame)}
        </p>
        <button ref={closeRef} type="button" aria-label="Close" onClick={onClose} className={`${controlClass(false)} right-2 top-2 flex`}>
          <span aria-hidden="true">Close ✕</span>
        </button>
        <button
          ref={prevRef}
          type="button"
          aria-label="Previous frame"
          aria-disabled={atStart ? "true" : undefined}
          onClick={() => go(-1)}
          className={`${controlClass(atStart)} left-2 top-1/2 hidden -translate-y-1/2 sm:flex`}
        >
          <span aria-hidden="true">←</span>
        </button>
        <button
          ref={nextRef}
          type="button"
          aria-label="Next frame"
          aria-disabled={atEnd ? "true" : undefined}
          onClick={() => go(1)}
          className={`${controlClass(atEnd)} right-2 top-1/2 hidden -translate-y-1/2 sm:flex`}
        >
          <span aria-hidden="true">→</span>
        </button>
        <img
          key={frame.src}
          src={frame.src}
          alt={frame.alt}
          width={frame.width}
          height={frame.height}
          className="max-h-[90vh] max-w-[92vw] object-contain"
        />
      </div>
    </div>,
    document.body,
  );
}
