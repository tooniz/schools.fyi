import type { CurriculumExpectation } from "./schema";

export const concepts = ["number sense","algebra","geometry","reading","writing","oral communication","media literacy"] as const;
export type Concept = typeof concepts[number];
export type Confidence = "direct" | "approximate" | "insufficient evidence";
const patterns: Record<Concept, RegExp> = {"number sense":/number|quantity|arithmetic/i,algebra:/algebra|pattern/i,geometry:/geometry|spatial|shape/i,reading:/read|phon/i,writing:/writ/i,"oral communication":/oral|speaking|listen/i,"media literacy":/media|digital/i};
export function normalizeConcept(value:string): Concept | undefined { return concepts.find((concept)=>patterns[concept].test(value)); }
export function editorialAlignment(a:CurriculumExpectation,b:CurriculumExpectation):Confidence { const left=normalizeConcept(`${a.strand} ${a.comparisonLabel}`); const right=normalizeConcept(`${b.strand} ${b.comparisonLabel}`); if(!left||!right)return "insufficient evidence"; if(left!==right)return "insufficient evidence"; return a.strand.toLowerCase()===b.strand.toLowerCase()?"direct":"approximate"; }
export const alignmentDisclaimer = "Editorial alignment only; it is not a formal equivalency or placement recommendation.";
