import { useEffect, useId, useMemo, useRef, useState, type FocusEvent, type KeyboardEvent, type MouseEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { HINT_LINE, IDLE_LINES, type Line } from "./commands";
import { Companions } from "./Companion";
import { useTerminal, type TerminalApi } from "./useTerminal";

const KIND_CLASS: Record<Exclude<Line["kind"], "link">, string> = {
  prompt: "text-accent",
  text: "text-ink-soft",
  error: "text-ink",
  hint: "text-ink-faint",
};
const LINK_CLASS = "text-accent underline-offset-4 hover:underline";
// Pinned to the idle body's rendered height (two prompt/output pairs) at each
// width where the idle lines wrap differently, so activation never moves the hero.
export const LOG_HEIGHT = "h-[9.25rem] min-[24.875rem]:h-[8.25rem] min-[29.8125rem]:h-[7.25rem] sm:h-[8.25rem]";
// While active the log grows; below sm it is capped so the input stays above the phone keyboard.
export const LOG_HEIGHT_ACTIVE = "h-[min(22rem,60svh)] sm:h-[22rem]";
/** Inactive only: a blinking block after the pending prompt (solid under reduced motion). */
const IdleCursor = () => (
  <span
    data-testid="idle-cursor"
    aria-hidden="true"
    className="text-accent animate-[blink_1s_steps(1)_infinite] motion-reduce:animate-none"
  >
    ▍
  </span>
);
const HINT_WORDS = HINT_LINE.text.replace(/^try:\s*/, "").split(" · ");

/** Each prompt starts a group; output lines sit 4px under it, groups 12px apart. */
function groupLines(lines: Line[]): { start: number; lines: Line[] }[] {
  const groups: { start: number; lines: Line[] }[] = [];
  lines.forEach((line, i) => {
    const last = groups[groups.length - 1];
    if (line.kind === "prompt" || !last) groups.push({ start: i, lines: [line] });
    else last.lines.push(line);
  });
  return groups;
}

function LineView({ line, first, cursor }: { line: Line; first: boolean; cursor?: boolean }) {
  const gap = first ? undefined : "mt-1";
  if (cursor && line.kind !== "link") {
    // The idle view has no spare row, so the cursor ends the last line. It is
    // zero-width so it can never re-wrap that line (the log heights are pinned to its wraps).
    return (
      <p className={gap ? `${gap} ${KIND_CLASS[line.kind]}` : KIND_CLASS[line.kind]}>
        <span>{line.text}</span>
        <span className="inline-block w-0 whitespace-nowrap">
          <span className="ml-[0.5ch]">
            <IdleCursor />
          </span>
        </span>
      </p>
    );
  }
  if (line.kind === "link") {
    return (
      <p className={gap}>
        <a
          href={line.href}
          className={LINK_CLASS}
          {...(line.external ? { target: "_blank", rel: "noreferrer" } : {})}
        >
          {line.text}
        </a>
      </p>
    );
  }
  return <p className={gap ? `${gap} ${KIND_CLASS[line.kind]}` : KIND_CLASS[line.kind]}>{line.text}</p>;
}

function HintLine({ api, focusInput }: { api: TerminalApi; focusInput: () => void }) {
  const run = (word: string) => (e: MouseEvent) => {
    e.preventDefault();
    if (word === "ask") {
      api.setInput("ask ");
    } else {
      api.setInput(word);
      api.submit();
    }
    focusInput();
  };
  return (
    <p className={`mt-1 ${KIND_CLASS.hint}`}>
      try:{" "}
      {HINT_WORDS.map((word, i) => (
        <span key={word}>
          {i > 0 && " · "}
          <a href="#" onClick={run(word)} className={LINK_CLASS}>
            {word}
          </a>
        </span>
      ))}
    </p>
  );
}

export default function Terminal() {
  const reduceMotion = useReducedMotion() ?? false;
  const [state, api] = useTerminal({ reduceMotion });
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idle = state.lines === IDLE_LINES;
  const showPrompt = state.active || !idle;
  const focusInput = () => inputRef.current?.focus();
  const hintId = useId();
  // The title-bar label shows until the first activation, then never again this mount.
  const [everActive, setEverActive] = useState(false);
  if (state.active && !everActive) setEverActive(true);
  const hoverNone = useMemo(
    () => typeof window.matchMedia === "function" && window.matchMedia("(hover: none)").matches,
    [],
  );

  // The input mounts on activation, so focus it once it exists.
  useEffect(() => {
    if (state.active) inputRef.current?.focus();
  }, [state.active]);

  // Keep the newest line in view, now and again once the height transition settles.
  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    log.scrollTop = log.scrollHeight;
    const onEnd = (e: TransitionEvent) => {
      if (e.target === log && e.propertyName === "height") log.scrollTop = log.scrollHeight;
    };
    log.addEventListener("transitionend", onEnd);
    return () => log.removeEventListener("transitionend", onEnd);
  }, [state.lines, showPrompt, state.showHint, state.active]);

  /** The cat is its own button: focusing or clicking it never activates the terminal. */
  const onCat = (e: { target: EventTarget }) => (e.target as Element).closest("[data-cat]") !== null;
  const onFocus = (e: FocusEvent<HTMLDivElement>) => {
    if (onCat(e)) return;
    api.activate();
    if (e.target === e.currentTarget) focusInput();
  };
  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) api.deactivate();
  };
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    // A real link (e.g. "→ jump to projects") navigates; don't pull focus back into the hero.
    const link = (e.target as Element).closest("a");
    if (link && link.getAttribute("href") !== "#") return;
    api.activate();
    focusInput();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (!e.nativeEvent.isComposing) api.submit();
    }
    else if (e.key === "ArrowUp") {
      e.preventDefault();
      api.historyUp();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      api.historyDown();
    } else if (e.key === "Tab" && !e.shiftKey) {
      // Swallow Tab only when it completed something, so it never traps keyboard focus.
      if (api.tabComplete()) e.preventDefault();
    } else if (e.ctrlKey && e.key.toLowerCase() === "l") {
      e.preventDefault();
      api.clear();
    } else if (e.key === "Escape") e.currentTarget.blur();
  };

  return (
    <div
      className="relative"
      role="group"
      data-active={state.active ? "true" : "false"}
      // Untabbable while active, so Shift+Tab from the input leaves the card.
      tabIndex={state.active ? -1 : 0}
      aria-label="Interactive terminal. Click or press Enter to type commands."
      onClick={onClick}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <p id={hintId} className="sr-only">
        Click or press Enter to type commands. Arrow keys recall history, Tab completes, Escape leaves. The card grows while you type.
      </p>
      <div
        data-testid="terminal-card"
        className={`overflow-hidden rounded-xl border bg-surface text-left shadow-2xl shadow-black/40 transition-colors ${
          state.active ? "border-accent/60" : "border-line hover:border-accent/60 cursor-text"
        }`}
      >
        <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-ink-faint/60" aria-hidden="true" />
          <span className="h-3 w-3 rounded-full bg-ink-faint/60" aria-hidden="true" />
          <span className="h-3 w-3 rounded-full bg-ink-faint/60" aria-hidden="true" />
          <span className="ml-2 whitespace-nowrap font-mono text-xs text-ink-faint">ahnaf@portfolio: ~</span>
          {!state.active && !everActive && (
            <span
              data-testid="type-hint"
              className="ml-auto hidden whitespace-nowrap font-mono text-xs text-ink-faint min-[23rem]:inline"
            >
              {hoverNone ? "tap to type" : "click to type"}
            </span>
          )}
        </div>
        <div
          ref={logRef}
          role="log"
          aria-live="polite"
          data-testid="terminal-log"
          onClick={state.busy ? api.finishTyping : undefined}
          className={`${state.active ? LOG_HEIGHT_ACTIVE : LOG_HEIGHT} transition-[height] duration-[260ms] ease-out motion-reduce:transition-none space-y-3 overflow-y-auto p-4 font-mono text-xs whitespace-pre-wrap [overflow-wrap:anywhere] sm:text-sm`}
        >
          {groupLines(state.lines).map((group, gi, groups) => (
            <motion.div
              key={group.start}
              initial={idle ? { opacity: 0, x: -8 } : false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.5 + gi * 0.35 }}
            >
              {group.lines.map((line, i) => (
                <LineView
                  key={group.start + i}
                  line={line}
                  first={i === 0}
                  cursor={!showPrompt && gi === groups.length - 1 && i === group.lines.length - 1}
                />
              ))}
            </motion.div>
          ))}
          {showPrompt && (
            <div>
              <p className={`flex items-center ${KIND_CLASS.prompt}`}>
                <span>$ </span>
                {state.active ? (
                  <input
                    ref={inputRef}
                    aria-label="terminal input"
                    aria-describedby={hintId}
                    value={state.input}
                    onChange={(e) => api.setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    // 16px on phones so iOS does not zoom the page on focus; matches the log from sm up.
                    className="min-w-0 flex-1 bg-transparent text-base text-ink caret-accent outline-none sm:text-sm"
                  />
                ) : (
                  // Inactive with output: the pending text and the idle block cursor;
                  // while active the input's own accent caret takes over.
                  <>
                    <span className="text-ink">{state.input}</span>
                    <IdleCursor />
                  </>
                )}
              </p>
              {state.active && state.showHint && <HintLine api={api} focusInput={focusInput} />}
            </div>
          )}
        </div>
      </div>
      {/* After the log, so the cat's button comes after the input in tab order. */}
      <Companions
        skin={state.skin}
        shades={state.shades}
        petTick={state.petTick}
        loveTick={state.loveTick}
        thinking={state.asking}
        askOutcome={state.askOutcome}
        reduceMotion={reduceMotion}
        onPlay={() => {}}
      />
    </div>
  );
}
