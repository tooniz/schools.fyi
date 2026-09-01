import { levelingSubjects, type LevelingSubject } from "./schema";

export const DEFAULT_PROGRAMS = ["ontario", "bayview-glen", "havergal", "bishop-strachan", "tfs"];
export const DEFAULT_SUBJECT: LevelingSubject = "mathematics";
export type LevelingState = { subject: LevelingSubject; programs: string[] };

export function parseState(params: URLSearchParams, validPrograms: string[]): LevelingState {
  const requestedSubject = params.get("subject");
  const subject = levelingSubjects.includes(requestedSubject as LevelingSubject) ? (requestedSubject as LevelingSubject) : DEFAULT_SUBJECT;
  const requested = params.get("programs")?.split(",").filter(Boolean) ?? DEFAULT_PROGRAMS;
  const programs = [...new Set(requested)].filter((id) => validPrograms.includes(id));
  return { subject, programs: programs.length ? programs : DEFAULT_PROGRAMS.filter((id) => validPrograms.includes(id)) };
}

export function serializeState(state: LevelingState) {
  const params = new URLSearchParams();
  params.set("subject", state.subject);
  params.set("programs", state.programs.join(","));
  return `?${params.toString()}`;
}
