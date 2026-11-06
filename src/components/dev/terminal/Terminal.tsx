import { useEffect, useId, useRef, type FocusEvent, type KeyboardEvent, type MouseEvent } from "react";
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
const LOG_HEIGHT = "h-[9.25rem] min-[24.875rem]:h-[8.25rem] min-[29.8125rem]:h-[7.25rem] sm:h-[8.25rem]";
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

function LineView({ line, first }: { line: Line; first: boolean }) {
  const gap = first ? undefined : "mt-1";
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

  // The input mounts on activation, so focus it once it exists.
  useEffect(() => {
    if (state.active) inputRef.current?.focus();
  }, [state.active]);

  // Keep the newest line in view.
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [state.lines, showPrompt, state.showHint]);

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
      // Untabbable while active, so Shift+Tab from the input leaves the card.
      tabIndex={state.active ? -1 : 0}
      aria-label="Interactive terminal. Click or press Enter to type commands."
      onClick={onClick}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <p id={hintId} className="sr-only">
        Click or press Enter to type commands. Arrow keys recall history, Tab completes, Escape leaves.
      </p>
      <div className="overflow-hidden rounded-xl border border-line bg-surface text-left shadow-2xl shadow-black/40">
        <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-ink-faint/60" aria-hidden="true" />
          <span className="h-3 w-3 rounded-full bg-ink-faint/60" aria-hidden="true" />
          <span className="h-3 w-3 rounded-full bg-ink-faint/60" aria-hidden="true" />
          <span className="ml-2 font-mono text-xs text-ink-faint">ahnaf@portfolio: ~</span>
        </div>
        <div
          ref={logRef}
          role="log"
          aria-live="polite"
          onClick={state.busy ? api.finishTyping : undefined}
          className={`${LOG_HEIGHT} space-y-3 overflow-y-auto p-4 font-mono text-xs whitespace-pre-wrap [overflow-wrap:anywhere] sm:text-sm`}
        >
          {groupLines(state.lines).map((group, gi) => (
            <motion.div
              key={group.start}
              initial={idle ? { opacity: 0, x: -8 } : false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.5 + gi * 0.35 }}
            >
              {group.lines.map((line, i) => (
                <LineView key={group.start + i} line={line} first={i === 0} />
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
                  // Inactive with output: only the pending text; the cursor (the
                  // input's accent caret) shows only while active.
                  <span className="text-ink">{state.input}</span>
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
        thinking={state.asking}
        askOutcome={state.askOutcome}
        reduceMotion={reduceMotion}
      />
    </div>
  );
}
