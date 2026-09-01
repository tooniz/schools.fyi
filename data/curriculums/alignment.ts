import type { AlignmentLevel, ComparisonEntity, Source } from "../../src/lib/schema";

export const alignmentSources: Source[] = [
  { id: "on-program", canonicalUrl: "https://www.ontario.ca/page/education-ontario", publisher: "Government of Ontario", accessDate: "2026-09-01", pageTitle: "Education in Ontario", kind: "official-requirement" },
  { id: "ap-program", canonicalUrl: "https://apstudents.collegeboard.org/what-is-ap", publisher: "College Board", accessDate: "2026-09-01", pageTitle: "What Is AP?", kind: "official-requirement" },
  { id: "ib-programmes", canonicalUrl: "https://www.ibo.org/programmes/", publisher: "International Baccalaureate", accessDate: "2026-09-01", pageTitle: "Our programmes", kind: "official-requirement" },
  { id: "bvg-school", canonicalUrl: "https://www.bayviewglen.ca/schools/upper-school/curriculum/", publisher: "Bayview Glen", accessDate: "2026-09-01", pageTitle: "Upper School Curriculum", kind: "school-published" },
];

export const comparisonEntities: ComparisonEntity[] = [
  { id: "bayview-glen", name: "Bayview Glen", shortName: "Bayview Glen", category: "school", descriptor: "Toronto independent school · Preschool–Grade 12", methodology: "BVG uses Ontario grade labels. JK–12 are positioned directly against Ontario; its preschool years sit before JK. AP is an Upper School enrichment, not a separate BVG grade.", sourceIds: ["bvg-school"] },
  { id: "ontario", name: "Ontario Curriculum", shortName: "Ontario", category: "curriculum", descriptor: "Provincial reference scale · JK–Grade 12", methodology: "Ontario grade boundaries form the reference axis. Each Ontario box occupies one equal grade interval; this is a positioning scale, not a claim that learning grows at a constant rate.", sourceIds: ["on-program"] },
  { id: "ap", name: "Advanced Placement", shortName: "AP", category: "curriculum", descriptor: "Subject-specific college-level courses", methodology: "AP is not a K–12 curriculum or grade ladder. It is shown only in the senior-secondary region because it offers college-level courses taken during high school; timing varies by school, student, and subject.", sourceIds: ["ap-program"] },
  { id: "ib", name: "International Baccalaureate", shortName: "IB", category: "curriculum", descriptor: "Four age-based international programmes", methodology: "IB's official age ranges are positioned against the typical Ontario grade ages. The overlap is intentional: IB programmes use ages and schools determine transitions, so these are approximate rather than formal equivalencies.", sourceIds: ["ib-programmes"] },
];

const ontarioLabels = ["JK", "SK", ...Array.from({ length: 12 }, (_, index) => `Grade ${index + 1}`)];
const directLevels = (entityId: string, sourceId: string): AlignmentLevel[] => ontarioLabels.map((label, index) => ({
  id: `${entityId}-${index}`, entityId, label, detail: `${label} on the Ontario JK–12 sequence.`, ontarioStart: index, ontarioEnd: index + 1, confidence: "direct", rationale: entityId === "ontario" ? "Reference interval on the Ontario scale." : "Bayview Glen publishes the same Ontario grade designation.", sourceId,
}));

export const alignmentLevels: AlignmentLevel[] = [
  ...directLevels("ontario", "on-program"),
  ...directLevels("bayview-glen", "bvg-school"),
  { id: "ap-coursework", entityId: "ap", label: "AP courses", detail: "Subject-specific college-level work completed while in high school.", ontarioStart: 10, ontarioEnd: 14, confidence: "contextual", rationale: "AP has no universal grade sequence. This band indicates senior-secondary context, not four AP grade levels or guaranteed availability.", sourceId: "ap-program" },
  { id: "ib-pyp", entityId: "ib", label: "Primary Years Programme", detail: "IB programme for students aged 3–12.", ontarioStart: 0, ontarioEnd: 7.5, confidence: "approximate", rationale: "The official age range is aligned to typical Ontario ages, spanning the primary years into roughly Grade 6.", sourceId: "ib-programmes" },
  { id: "ib-myp", entityId: "ib", label: "Middle Years Programme", detail: "IB programme for students aged 11–16.", ontarioStart: 6.5, ontarioEnd: 11.5, confidence: "approximate", rationale: "The official age range overlaps PYP and maps roughly from late elementary through Grade 10.", sourceId: "ib-programmes" },
  { id: "ib-dp", entityId: "ib", label: "Diploma Programme", detail: "IB programme for students aged 16–19.", ontarioStart: 11.5, ontarioEnd: 14, confidence: "approximate", rationale: "The two-year Diploma Programme typically aligns most closely with Ontario Grades 11–12; the official age range extends beyond secondary school.", sourceId: "ib-programmes" },
  { id: "ib-cp", entityId: "ib", label: "Career-related Programme", detail: "IB career-related programme for students aged 16–19.", ontarioStart: 11.5, ontarioEnd: 14, confidence: "approximate", rationale: "Like DP, CP begins around age 16 and extends beyond the Ontario secondary endpoint.", sourceId: "ib-programmes" },
];
