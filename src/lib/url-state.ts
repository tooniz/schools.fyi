import { levelingSubjects, type LevelingSubject } from "./schema";

export const DEFAULT_PROGRAMS = ["ontario", "bayview-glen", "havergal", "bishop-strachan", "tfs"];
export const DEFAULT_SUBJECT: LevelingSubject = "mathematics";
export const MAX_PROGRAMS = 5;
export type LevelingState = { subject: LevelingSubject; programs: string[] };

/** Adds a track on the right, dropping the oldest once the comparison is full. */
export function addProgram(current: string[], id: string): string[] {
  if (current.includes(id)) return current;
  return [...current, id].slice(-MAX_PROGRAMS);
}

export function parseState(params: URLSearchParams, validPrograms: string[]): LevelingState {
  const requestedSubject = params.get("subject");
  const subject = levelingSubjects.includes(requestedSubject as LevelingSubject) ? (requestedSubject as LevelingSubject) : DEFAULT_SUBJECT;
  const requested = params.get("programs")?.split(",").filter(Boolean) ?? DEFAULT_PROGRAMS;
  const programs = [...new Set(requested)].filter((id) => validPrograms.includes(id)).slice(0, MAX_PROGRAMS);
  return { subject, programs: programs.length ? programs : DEFAULT_PROGRAMS.filter((id) => validPrograms.includes(id)).slice(0, MAX_PROGRAMS) };
}

export function serializeState(state: LevelingState) {
  const params = new URLSearchParams();
  params.set("subject", state.subject);
  params.set("programs", state.programs.join(","));
  return `?${params.toString()}`;
}
