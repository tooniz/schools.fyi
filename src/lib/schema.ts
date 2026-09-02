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

export const levelingSubjects = ["mathematics", "language", "french"] as const;
export const LevelingSubjectSchema = z.enum(levelingSubjects);
export type LevelingSubject = z.infer<typeof LevelingSubjectSchema>;

export const evidenceKinds = ["official-curriculum", "school-published", "school-course-calendar", "university-credit-policy", "community-thread", "secondary-directory"] as const;
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

export const ProgramSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  /** Formal name, used for search and attribution. */
  name: z.string().min(1),
  /** Column headers and the picker, where there is room to read. */
  displayName: z.string().min(1),
  /** Selected-track chips, where there is not. */
  abbreviation: z.string().min(1),
  kind: z.enum(["public-curriculum", "independent-school", "international-framework"]),
  location: z.string().min(1),
  url: z.url(),
  descriptor: z.string().min(1),
  methodology: z.string().min(1),
  gradeLabels: z.array(z.string().min(1).nullable()).length(gradeLevels.length),
  evidenceIds: z.array(z.string()).min(1),
});
export type Program = z.infer<typeof ProgramSchema>;

export const confidenceTiers = ["documented", "approximate", "community-reported", "insufficient-evidence"] as const;
export const ConfidenceTierSchema = z.enum(confidenceTiers);
export type ConfidenceTier = z.infer<typeof ConfidenceTierSchema>;

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
  evidenceIds: z.array(z.string()).min(1),
});
export type OffsetRule = z.infer<typeof OffsetRuleSchema>;
