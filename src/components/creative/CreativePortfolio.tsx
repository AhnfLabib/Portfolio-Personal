import { useRef, useState } from "react";
import { creative } from "../../data/content";
import CreativeHero from "./CreativeHero";
import CreativeStatement from "./CreativeStatement";
import CreativeRolls from "./CreativeRolls";
import CreativeMusic from "./CreativeMusic";
import CreativeContact from "./CreativeContact";
import Lightbox from "./Lightbox";
import type { Pos } from "./lightboxNav";

export default function CreativePortfolio() {
  const [pos, setPos] = useState<Pos | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const onOpen = (roll: number, frame: number) => {
    // Capture the opener before the dialog mounts and takes focus.
    openerRef.current = document.activeElement as HTMLElement;
    setPos({ roll, frame });
  };

  return (
    <main id="creative-portfolio">
      <CreativeHero />
      <CreativeStatement />
      <CreativeRolls onOpen={onOpen} />
      <CreativeMusic />
      <CreativeContact />
      <Lightbox
        rolls={creative.rolls}
        pos={pos}
        onClose={() => setPos(null)}
        onNavigate={setPos}
        returnFocusTo={openerRef.current}
      />
    </main>
  );
}
