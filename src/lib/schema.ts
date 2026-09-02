import { z } from "zod";

export const subjects = ["language", "math"] as const;
export const SubjectSchema = z.enum(subjects);
export type Subject = z.infer<typeof SubjectSchema>;
export const gradeLevels = ["JK", "SK", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] as const;
export const GradeLevelSchema = z.enum(gradeLevels);
export type GradeLevel = z.infer<typeof GradeLevelSchema>;

export const SourceSchema = z.object({id:z.string().min(1),canonicalUrl:z.url(),publisher:z.string().min(1),accessDate:z.iso.date(),pageTitle:z.string().min(1),documentReference:z.string().optional(),pageReference:z.string().optional(),kind:z.enum(["official-requirement","school-published","community-submission"])});
export type Source = z.infer<typeof SourceSchema>;
export const SchoolSchema = z.object({id:z.string().regex(/^[a-z0-9-]+$/),name:z.string().min(1),shortName:z.string().min(1),type:z.enum(["public-curriculum","supplemental-program","independent-school"]),url:z.url(),location:z.string().min(1),supportedGrades:z.array(GradeLevelSchema),methodology:z.string().min(1),sourceIds:z.array(z.string()).min(1),reviewed:z.boolean()});
export type School = z.infer<typeof SchoolSchema>;
export const CurriculumExpectationSchema = z.object({id:z.string().min(1),schoolId:z.string(),subject:SubjectSchema,grade:GradeLevelSchema,strand:z.string().min(1),sourceText:z.string().min(1),comparisonLabel:z.string().min(1),expectation:z.string().min(1),sequence:z.number().int().nonnegative(),sourceId:z.string(),sourceLocator:z.string().min(1),verificationStatus:z.enum(["verified","not-publicly-documented","pending-review"]),lastReviewed:z.iso.date(),qualificationNotes:z.string().optional()});
export type CurriculumExpectation = z.infer<typeof CurriculumExpectationSchema>;

export const levelingSubjects = ["mathematics", "language", "french", "science"] as const;
export const LevelingSubjectSchema = z.enum(levelingSubjects);
export type LevelingSubject = z.infer<typeof LevelingSubjectSchema>;
export const subjectLabels: Record<LevelingSubject, string> = {
  mathematics: "Mathematics",
  language: "English / Language",
  french: "French",
  science: "Science",
};

/** One word each, because these labels sit under a name in a dropdown and
 *  beside four others in the legend. Kept here rather than beside the picker so
 *  server-rendered pages can read them: a value exported from a "use client"
 *  module arrives on the server as a client reference, not as the object. */
export const kindLabels = {
  "public-curriculum": "Curriculum",
  "independent-school": "School",
  "international-framework": "Framework",
  "enrichment-program": "Enrichment program",
} as const;

export const evidenceKinds = ["official-curriculum", "school-published", "school-course-calendar", "university-credit-policy", "school-outcome-report", "assessment-policy", "community-thread", "secondary-directory"] as const;
export const EvidenceSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(evidenceKinds),
  publisher: z.string().min(1),
  title: z.string().min(1),
  canonicalUrl: z.url(),
  accessDate: z.iso.date(),
  platform: z.string().min(1).optional(),
  quote: z.string().min(1).optional(),
  corroboration: z.enum(["single-anecdote", "several-voices", "not-applicable"]).optional(),
});
export type Evidence = z.infer<typeof EvidenceSchema>;
export const isCommunityEvidence = (evidence: Evidence) => evidence.kind === "community-thread";

export const pathwayKinds = ["required", "optional", "reach-ahead", "placement"] as const;
export const PathwayKindSchema = z.enum(pathwayKinds);
export type PathwayKind = z.infer<typeof PathwayKindSchema>;
export const pathwayKindLabels: Record<PathwayKind, string> = {
  required: "Required",
  optional: "Optional",
  "reach-ahead": "Reach-ahead",
  placement: "Placement-based",
};

export const ProgramPathwaySchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  label: z.string().min(1),
  kind: PathwayKindSchema,
  description: z.string().min(1),
  subjects: z.array(LevelingSubjectSchema).min(1),
  default: z.boolean().optional(),
});
export type ProgramPathway = z.infer<typeof ProgramPathwaySchema>;

export const ProgramSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  /** Formal name, used for search and attribution. */
  name: z.string().min(1),
  /** Column headers and the picker, where there is room to read. */
  displayName: z.string().min(1),
  /** Selected-track chips, where there is not. */
  abbreviation: z.string().min(1),
  kind: z.enum(["public-curriculum", "independent-school", "international-framework", "enrichment-program"]),
  /** Single-sex admission, shown as a glyph. Absent on curricula, which admit nobody. */
  admits: z.enum(["boys", "girls", "coed"]).optional(),
  /**
   * The framework a school delivers, which is a separate axis from what the
   * program is: an independent school can run the IB or AP as its own
   * curriculum. Set only on schools, and only where a first-party source says
   * so — the tag drives a badge, so silence has to stay silent.
   */
  framework: z.enum(["ib", "ap"]).optional(),
  /**
   * How far the framework reaches, which the framework's name does not tell
   * you. `curriculum` means the school runs it as its own programme, grade
   * after grade; `courses` means an Ontario school where students opt into
   * individual courses in the senior years. Collapsing the two would make a
   * school offering three AP electives look like an IB continuum school.
   */
  frameworkScope: z.enum(["curriculum", "courses"]).optional(),
  location: z.string().min(1),
  url: z.url(),
  descriptor: z.string().min(1),
  methodology: z.string().min(1),
  gradeLabels: z.array(z.string().min(1).nullable()).length(gradeLevels.length),
  /** Sparse alternatives to the required/cohort rules. A selected pathway only
   * replaces the grade bands for which it publishes its own rules. */
  pathways: z.array(ProgramPathwaySchema).optional(),
  evidenceIds: z.array(z.string()).min(1),
});
export type Program = z.infer<typeof ProgramSchema>;

export const confidenceTiers = ["documented", "approximate", "community-reported", "insufficient-evidence"] as const;
export const ConfidenceTierSchema = z.enum(confidenceTiers);
export type ConfidenceTier = z.infer<typeof ConfidenceTierSchema>;

export const depthTiers = ["on-standard", "enriched", "advanced", "not-assessed"] as const;
export const DepthTierSchema = z.enum(depthTiers);
export type DepthTier = z.infer<typeof DepthTierSchema>;
export const depthLabels: Record<DepthTier, string> = {
  "on-standard": "Ontario-standard depth",
  enriched: "Enriched depth",
  advanced: "Advanced depth",
  "not-assessed": "Depth not separately assessed",
};

export const paceTiers = ["on-standard", "faster", "variable", "not-assessed"] as const;
export const PaceTierSchema = z.enum(paceTiers);
export type PaceTier = z.infer<typeof PaceTierSchema>;
export const paceLabels: Record<PaceTier, string> = {
  "on-standard": "Ontario-standard pace",
  faster: "Faster than Ontario",
  variable: "Variable pace",
  "not-assessed": "Pace not separately assessed",
};

export const OffsetRuleSchema = z.object({
  id: z.string().min(1),
  programId: z.string().min(1),
  subject: LevelingSubjectSchema,
  fromGradeIndex: z.number().int().min(0).max(gradeLevels.length - 1),
  toGradeIndex: z.number().int().min(0).max(gradeLevels.length - 1),
  coverage: z.enum(["taught", "not-offered"]),
  offsetYears: z.number().min(-3).max(4),
  spanYears: z.number().min(0.25).max(4),
  confidence: ConfidenceTierSchema,
  claim: z.string().min(1),
  rationale: z.string().min(1),
  acceleratedPathway: z.string().min(1).optional(),
  /** Omitted rules belong to the program's default pathway. Alternative
   * pathway rules may be sparse and override only their own grade bands. */
  pathwayId: z.string().regex(/^[a-z0-9-]+$/).optional(),
  /** Depth and pace are independent editorial findings. They must not be
   * inferred from a positive content-timing offset. */
  depth: DepthTierSchema.optional(),
  pace: PaceTierSchema.optional(),
  evidenceIds: z.array(z.string()).min(1),
});
export type OffsetRule = z.infer<typeof OffsetRuleSchema>;

export const outcomeEventTypes = ["offer", "acceptance", "intended-destination", "matriculation", "placement"] as const;
export const OutcomeEventTypeSchema = z.enum(outcomeEventTypes);
export type OutcomeEventType = z.infer<typeof OutcomeEventTypeSchema>;

export const outcomeQualityFlags = [
  "missing-denominator",
  "ambiguous-event-type",
  "mixed-cohorts",
  "selected-examples",
  "arithmetic-mismatch",
  "non-exhaustive-categories",
  "duplicate-offers-possible",
] as const;

export const OutcomeObservationSchema = z.object({
  label: z.string().min(1),
  value: z.number().nonnegative(),
  unit: z.enum(["students", "percent", "offers", "distinct-institutions"]),
});
export type OutcomeObservation = z.infer<typeof OutcomeObservationSchema>;

export const OutcomeDisclosureSchema = z.object({
  id: z.string().min(1),
  programId: z.string().min(1),
  cohortLabel: z.string().min(1),
  eventType: OutcomeEventTypeSchema,
  scope: z.enum(["single-cohort", "rolling-years", "cumulative", "unknown"]),
  summary: z.string().min(1),
  denominator: z.number().int().positive().optional(),
  observations: z.array(OutcomeObservationSchema),
  qualityFlags: z.array(z.enum(outcomeQualityFlags)),
  evidenceIds: z.array(z.string()).min(1),
});
export type OutcomeDisclosure = z.infer<typeof OutcomeDisclosureSchema>;
