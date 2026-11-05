import { useEffect, useRef, useState, type JSX, type KeyboardEvent } from "react";
import type { Draft } from "../../data/content";
import { formatTime } from "./player";

type Props = {
  draft: Draft;
  index: number;
  playing: boolean;
  onPlay: (index: number) => void;
  onPause: () => void;
  onEnded: () => void;
};

export default function DraftPlayer({ draft, index, playing, onPlay, onPause, onEnded }: Props): JSX.Element {
  const audioRef = useRef<HTMLAudioElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [current, setCurrent] = useState(0);
  const onPauseRef = useRef(onPause);
  useEffect(() => {
    onPauseRef.current = onPause;
  }, [onPause]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!playing) {
      audio.pause();
      return;
    }
    // Autoplay policies or a missing file reject the promise: drop the playing
    // state so the row doesn't claim to play. Skip if this row has since stopped.
    let stale = false;
    audio.play()?.catch(() => {
      if (!stale) onPauseRef.current();
    });
    return () => {
      stale = true;
    };
  }, [playing]);

  const toggle = () => (playing ? onPause() : onPlay(index));

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== " ") return;
    // The button already activates on Space; don't toggle twice.
    if (e.target === buttonRef.current) return;
    e.preventDefault();
    toggle();
  };

  return (
    <div tabIndex={-1} onKeyDown={onKeyDown} className="flex items-center gap-4 py-3 border-b border-line">
      <button
        ref={buttonRef}
        type="button"
        aria-pressed={playing}
        aria-label={`${playing ? "Pause" : "Play"} ${draft.title}`}
        onClick={toggle}
        className="w-6 shrink-0 text-accent"
      >
        <span aria-hidden="true">{playing ? "❚❚" : "▶"}</span>
      </button>
      <p className="shrink-0">
        <span className="font-display text-lg text-ink">{draft.title}</span>
        {draft.month !== "" && (
          <>
            <span aria-hidden="true" className="text-ink-faint">
              {" · "}
            </span>
            <span className="font-mono text-xs uppercase tracking-wide text-ink-faint">{draft.month}</span>
          </>
        )}
      </p>
      <input
        type="range"
        min={0}
        max={draft.duration}
        step={0.1}
        value={current}
        aria-label={`Seek ${draft.title}`}
        onChange={(e) => {
          const value = Number(e.target.value);
          if (audioRef.current) audioRef.current.currentTime = value;
          setCurrent(value);
        }}
        className="accent-accent flex-1"
      />
      <span className="shrink-0 font-mono text-xs text-ink-faint tabular-nums">
        {formatTime(current)} / {formatTime(draft.duration)}
      </span>
      <audio
        ref={audioRef}
        preload="none"
        src={draft.src}
        hidden
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onEnded={onEnded}
      />
    </div>
  );
}
