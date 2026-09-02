import type { ConfidenceTier, LevelingSubject } from "./schema";

/** The repository behind this site, used when no hosted form is configured. */
export const ISSUES_URL = "https://github.com/tooniz/schools.fyi/issues/new";

/**
 * A hosted form endpoint (Formspree, Basin, Getform, Static Forms — they all
 * accept the same multipart POST). Read through a function rather than a
 * constant so a build without it configured still type-checks, and so tests can
 * stub it; `NEXT_PUBLIC_` values are string-replaced wherever they appear.
 *
 * This is deliberately public. It ships inside the client bundle, so it belongs
 * in a repository variable rather than a secret.
 */
export function reportEndpoint(): string {
  return process.env.NEXT_PUBLIC_REPORT_ENDPOINT ?? "";
}

/** What the reader was looking at when they decided something was wrong. */
export interface ReportContext {
  program?: string;
  subject?: LevelingSubject;
  level?: string;
  /** The comparison the reader had built, so a reviewer can reopen their view. */
  comparison?: string;
  /** The specific document that would settle an unresolved placement. */
  ask?: string;
}

export const REPORT_FIELDS = ["program", "subject", "level", "comparison", "ask"] as const;

/** Anything short of `documented` is a placement we would rather have a source for. */
export const isWeakPlacement = (tier: ConfidenceTier) => tier !== "documented";

/**
 * What we are actually missing, phrased as the request that would close it.
 * Asking for a specific document gets answers; asking for "feedback" does not.
 */
export function settlingAsk(tier: ConfidenceTier, programName: string, subjectLabel: string, level: string): string {
  const where = `${programName} ${level} ${subjectLabel.toLowerCase()}`;
  if (tier === "insufficient-evidence") {
    return `No public source establishes where ${where} sits, so it is held at the Ontario position. If you have a curriculum page, course calendar, or scope-and-sequence document that states the level or pace, please link it here.`;
  }
  if (tier === "community-reported") {
    return `The placement of ${where} rests on parent and student reports rather than a published document. If the school publishes something that confirms or contradicts it, please link it here.`;
  }
  return `The placement of ${where} is inferred from programme structure, course sequencing, or student age rather than a stated equivalency. If the school publishes an explicit statement about its level or pace, please link it here.`;
}

/** A prefilled path into the report form. Relative, so `basePath` still applies. */
export function reportPath(context: ReportContext = {}): string {
  const params = new URLSearchParams();
  for (const field of REPORT_FIELDS) {
    const value = context[field];
    if (value) params.set(field, value);
  }
  const query = params.toString();
  return query ? `/contribute?${query}` : "/contribute";
}
