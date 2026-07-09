import type { TextSegment } from "../../data/content";

interface SegmentedTextProps {
  /** Lines of runs; each inner array is rendered as its own block-level row. */
  lines: TextSegment[][];
  className?: string;
  lineClassName?: string;
}

/**
 * Renders `TextSegment[][]` for the creative persona: each line sits on its own
 * row so the Fraunces display face can mix roman and italic accent runs.
 */
export default function SegmentedText({
  lines,
  className,
  lineClassName,
}: SegmentedTextProps) {
  return (
    <span className={className}>
      {lines.map((line, lineIndex) => (
        <span key={lineIndex} className={`block ${lineClassName ?? ""}`}>
          {line.map((segment, segmentIndex) => {
            const classes = [
              segment.italic ? "italic" : "",
              segment.accent ? "text-accent" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <span key={segmentIndex} className={classes || undefined}>
                {segment.text}
              </span>
            );
          })}
        </span>
      ))}
    </span>
  );
}
