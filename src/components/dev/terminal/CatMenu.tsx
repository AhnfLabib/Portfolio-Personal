import { useEffect, useRef, type JSX, type KeyboardEvent, type SyntheticEvent } from "react";

const preventDefault = (e: { preventDefault(): void }) => e.preventDefault();
const stopPropagation = (e: SyntheticEvent) => e.stopPropagation();

/**
 * The cat's click menu: a small roving-focus menu bubble. The first item takes
 * focus on mount; ArrowUp/ArrowDown cycle (wrapping), Escape closes (and goes
 * no further), Tab closes and lets focus move on, a press outside closes.
 */
export function CatMenu(props: { onPlay(): void; onPet(): void; onNope(): void; onClose(): void }): JSX.Element {
  const { onPlay, onPet, onNope, onClose } = props;
  const menuRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const items = [
    { label: "play a game", run: onPlay },
    { label: "pet", run: onPet },
    { label: "nope", run: onNope },
  ];

  useEffect(() => {
    itemsRef.current[0]?.focus();
  }, []);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node | null)) onClose();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [onClose]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const els = itemsRef.current;
    const n = els.length;
    const i = els.indexOf(document.activeElement as HTMLButtonElement);
    const move = (to: number) => {
      e.preventDefault();
      els[((to % n) + n) % n]?.focus();
    };
    if (e.key === "ArrowDown") move(i < 0 ? 0 : i + 1);
    else if (e.key === "ArrowUp") move(i < 0 ? n - 1 : i - 1);
    else if (e.key === "Home") move(0);
    else if (e.key === "End") move(n - 1);
    else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation(); // never reaches the terminal input's Escape (which deactivates)
      onClose();
    } else if (e.key === "Tab") onClose(); // not prevented: focus moves on naturally
  };

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="cat menu"
      onKeyDown={onKeyDown}
      // Stays inside the cat: a click never reaches the card, and a pointer press never moves focus
      // (WebKit would hand it to the card and activate the terminal).
      onClick={stopPropagation}
      onPointerDown={preventDefault}
      onMouseDown={preventDefault}
      className="flex flex-col rounded-sm border border-line bg-surface-2 py-0.5 font-mono text-xs whitespace-nowrap text-ink shadow-lg shadow-black/30"
    >
      {items.map((item, i) => (
        <button
          key={item.label}
          ref={(el) => {
            itemsRef.current[i] = el;
          }}
          type="button"
          role="menuitem"
          tabIndex={-1}
          onClick={item.run}
          className="min-h-8 cursor-pointer px-3 text-left hover:bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
