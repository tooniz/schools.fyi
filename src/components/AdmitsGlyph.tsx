import type { Program } from "@/lib/schema";

/** Screen readers announce a bare ♂ as "male sign", so the glyph is decorative
 *  and the meaning is carried by text only assistive tech reads. */
const MARKS = {
  boys: { glyph: "\u2642", label: "boys' school" },
  girls: { glyph: "\u2640", label: "girls' school" },
} as const;

export function AdmitsGlyph({ admits }: { admits?: Program["admits"] }) {
  if (!admits || admits === "coed") return null;
  const mark = MARKS[admits];
  return (
    <span className="admits" data-admits={admits} title={mark.label}>
      <span aria-hidden="true">{mark.glyph}</span>
      <span className="visually-hidden">{` ${mark.label}`}</span>
    </span>
  );
}
