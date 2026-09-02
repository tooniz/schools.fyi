import type { Evidence } from "./schema";

/** CONTRIBUTING.md promises an annual re-check, so a year is the line. */
export const STALE_AFTER_MONTHS = 12;

/** School pages get rewritten every admissions cycle, so an old read is a warning. */
export function isStale(accessDate: string, now: Date = new Date()): boolean {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - STALE_AFTER_MONTHS);
  return new Date(`${accessDate}T00:00:00Z`).getTime() < cutoff.getTime();
}

export function formatAccessDate(accessDate: string): string {
  return new Date(`${accessDate}T00:00:00Z`).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function staleEvidence(evidence: Evidence[], now: Date = new Date()): Evidence[] {
  return evidence.filter((item) => isStale(item.accessDate, now));
}
