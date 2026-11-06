import { useEffect, useReducer, useRef, useState, type JSX } from "react";
import { creative } from "../../data/content";
import DraftPlayer from "./DraftPlayer";
import { playerReducer } from "./player";

export default function CreativeMusic(): JSX.Element {
  const { music } = creative;
  const listRef = useRef<HTMLUListElement>(null);
  // Without IntersectionObserver (jsdom, very old browsers) mount the embeds right away.
  const [mounted, setMounted] = useState(() => typeof IntersectionObserver === "undefined");
  const [player, dispatch] = useReducer(playerReducer, { playing: null });

  useEffect(() => {
    if (mounted) return;
    const list = listRef.current;
    if (!list) return;
    // One observer for the whole strip: the three Instagram bundles load together, only when near.
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setMounted(true);
          io.disconnect();
        }
      },
      { rootMargin: "400px" },
    );
    io.observe(list);
    return () => io.disconnect();
  }, [mounted]);

  return (
    <section id="music" className="scroll-mt-24 px-4 py-24 sm:px-6 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-display text-[2rem] leading-tight text-ink">Music</h2>
        <p className="mt-3 max-w-prose text-lg leading-relaxed text-ink">{music.line}</p>
        <a
          href={music.url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block font-mono text-xs uppercase tracking-wide text-accent underline-offset-4 hover:underline"
        >
          {music.handle} →
        </a>

        <ul
          ref={listRef}
          className="mt-10 flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 [scrollbar-width:thin]"
        >
          {music.covers.map(({ title, artist, reel }) => (
            <li key={reel} className="snap-start shrink-0 w-[min(70vw,300px)]">
              <div className={`aspect-[9/16] w-full${mounted ? "" : " bg-surface-2"}`}>
                {mounted && (
                  <iframe
                    src={`https://www.instagram.com/reel/${reel}/embed/`}
                    title={`${title} — cover by Ahnaf Labib`}
                    loading="lazy"
                    allow="encrypted-media"
                    className="h-full w-full border-0"
                  />
                )}
              </div>
              <a
                href={`https://www.instagram.com/reel/${reel}/`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 block font-mono text-xs uppercase tracking-wide text-ink-soft hover:text-accent"
              >
                {title}
                {artist ? ` · ${artist}` : ""}
              </a>
            </li>
          ))}
        </ul>

        {music.drafts.length > 0 && (
          <div className="mt-16 border border-line bg-surface-2 p-6 sm:p-8">
            <h3 className="font-display text-2xl text-ink">Drafts</h3>
            <p className="mt-1 font-mono text-xs uppercase tracking-wide text-ink-faint">{music.draftsLine}</p>
            <div className="mt-6 border-t border-line">
              {music.drafts.map((draft, i) => (
                <DraftPlayer
                  key={draft.src}
                  draft={draft}
                  index={i}
                  playing={player.playing === i}
                  onPlay={(index) => dispatch({ type: "play", index })}
                  onPause={() => dispatch({ type: "pause" })}
                  onEnded={() => dispatch({ type: "ended" })}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
