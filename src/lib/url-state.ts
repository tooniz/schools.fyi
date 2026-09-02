import { levelingSubjects, type LevelingSubject } from "./schema";

/** Ontario Google Trends, Web Search, trailing 12 months as measured
 * 2026-09-02. Bayview Glen is fixed by product choice; the next three
 * highest-interest school topics are UCC, Havergal, and Branksome. */
export const DEFAULT_PROGRAMS = ["ontario", "bayview-glen", "ucc", "havergal", "branksome"];
export const DEFAULT_SUBJECT: LevelingSubject = "mathematics";
export const MAX_PROGRAMS = 5;
export type LevelingState = {
  subject: LevelingSubject;
  programs: string[];
  /** One active pathway per program; omitted means that program's default. */
  pathways?: Record<string, string>;
  outcomes?: boolean;
};

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
  const activePrograms = programs.length ? programs : DEFAULT_PROGRAMS.filter((id) => validPrograms.includes(id)).slice(0, MAX_PROGRAMS);
  const pathways = Object.fromEntries(
    (params.get("pathways")?.split(",") ?? [])
      .map((entry) => entry.split(":"))
      .filter((parts): parts is [string, string] => parts.length === 2 && activePrograms.includes(parts[0]) && Boolean(parts[1])),
  );
  return {
    subject,
    programs: activePrograms,
    ...(Object.keys(pathways).length ? { pathways } : {}),
    ...(params.get("outcomes") === "university" ? { outcomes: true } : {}),
  };
}

export function serializeState(state: LevelingState) {
  const params = new URLSearchParams();
  params.set("subject", state.subject);
  params.set("programs", state.programs.join(","));
  const pathways = Object.entries(state.pathways ?? {}).filter(([programId, pathwayId]) => state.programs.includes(programId) && pathwayId);
  if (pathways.length) params.set("pathways", pathways.map(([programId, pathwayId]) => `${programId}:${pathwayId}`).join(","));
  if (state.outcomes) params.set("outcomes", "university");
  return `?${params.toString()}`;
}
