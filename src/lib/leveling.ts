import { EvidenceSchema, OffsetRuleSchema, OutcomeDisclosureSchema, ProgramSchema, gradeLevels, levelingSubjects } from "./schema";
import type { ConfidenceTier, DepthTier, Evidence, LevelingSubject, OffsetRule, OutcomeDisclosure, PaceTier, Program, ProgramPathway } from "./schema";

export const AXIS_SIZE = gradeLevels.length;
export const BEYOND_ROWS = 3;
export const TRACK_ROWS = AXIS_SIZE + BEYOND_ROWS;
export const BEYOND_LABEL = `beyond ${ontarioGradeLabel(AXIS_SIZE - 1)}`;
export function ontarioGradeLabel(index: number) {
  const grade = gradeLevels[index];
  if (!grade) return "Beyond Grade 12";
  return grade === "JK" || grade === "SK" ? grade : `Grade ${grade}`;
}

export interface LevelingCell {
  programId: string;
  gradeIndex: number;
  label: string;
  progressStart: number;
  progressEnd: number;
  offsetYears: number;
  spanYears: number;
  depth: DepthTier;
  pace: PaceTier;
  pathwayId?: string;
  confidence: ConfidenceTier;
  beyondScale: boolean;
  notOffered: boolean;
  rule: OffsetRule;
}

export interface LevelingColumn {
  program: Program;
  cells: LevelingCell[];
  headlineOffset: number;
  /** No rule exists for this subject yet — a gap in our research, not in the school. */
  unresearched: boolean;
  pathway: ProgramPathway | null;
}

export interface LevelingDataset {
  programs: Program[];
  evidence: Evidence[];
  rules: OffsetRule[];
  outcomes: OutcomeDisclosure[];
}

const bandKey = (rule: OffsetRule) => `${rule.programId}/${rule.subject}/${rule.pathwayId ?? "base"}`;

/** Every offset is measured against this program, so it defines the axis. */
export const REFERENCE_PROGRAM = "ontario";

/** False where the reference curriculum teaches nothing, so "on pace" would compare against a blank. */
export function referenceTeaches(dataset: LevelingDataset, subject: LevelingSubject, progress: number): boolean {
  const gradeIndex = Math.floor(progress + 1e-9);
  if (gradeIndex >= AXIS_SIZE) return true;
  const rule = dataset.rules.find(
    (candidate) => candidate.programId === REFERENCE_PROGRAM && candidate.subject === subject && gradeIndex >= candidate.fromGradeIndex && gradeIndex <= candidate.toGradeIndex,
  );
  return rule ? rule.coverage !== "not-offered" : false;
}

export function validateLeveling(input: { programs: unknown[]; evidence: unknown[]; rules: unknown[]; outcomes?: unknown[] }): LevelingDataset {
  const programs = input.programs.map((value) => ProgramSchema.parse(value));
  const evidence = input.evidence.map((value) => EvidenceSchema.parse(value));
  const rules = input.rules.map((value) => OffsetRuleSchema.parse(value));
  const outcomes = (input.outcomes ?? []).map((value) => OutcomeDisclosureSchema.parse(value));
  const evidenceIds = new Set(evidence.map(({ id }) => id));
  const programIds = new Set(programs.map(({ id }) => id));
  const seenIds = new Set<string>();

  for (const program of programs) {
    for (const id of program.evidenceIds) if (!evidenceIds.has(id)) throw new Error(`Program ${program.id} references unknown evidence: ${id}`);
    if (program.gradeLabels.every((label) => label === null)) throw new Error(`Program ${program.id} offers no grades`);
    // The framework tag means "this school runs someone else's framework", so a
    // framework wearing it would be claiming to run itself.
    if (program.framework && program.kind !== "independent-school") throw new Error(`Program ${program.id} is a ${program.kind} and cannot also carry the ${program.framework.toUpperCase()} tag`);
    if (Boolean(program.framework) !== Boolean(program.frameworkScope)) throw new Error(`Program ${program.id} must state a framework and how far it reaches, or neither`);
    const pathwayIds = new Set<string>();
    for (const pathway of program.pathways ?? []) {
      if (pathwayIds.has(pathway.id)) throw new Error(`Program ${program.id} has duplicate pathway id: ${pathway.id}`);
      pathwayIds.add(pathway.id);
    }
    if (program.pathways?.length && program.pathways.filter((pathway) => pathway.default).length !== 1) {
      throw new Error(`Program ${program.id} must have exactly one default pathway`);
    }
  }

  const covered = new Map<string, Map<number, string>>();
  for (const rule of rules) {
    if (seenIds.has(rule.id)) throw new Error(`Duplicate offset rule id: ${rule.id}`);
    seenIds.add(rule.id);
    if (!programIds.has(rule.programId)) throw new Error(`Offset rule ${rule.id} references unknown program: ${rule.programId}`);
    if (rule.toGradeIndex < rule.fromGradeIndex) throw new Error(`Offset rule ${rule.id} has an inverted grade band`);
    if (rule.coverage === "not-offered" && rule.offsetYears !== 0) throw new Error(`Offset rule ${rule.id} is not offered yet carries an offset`);
    for (const id of rule.evidenceIds) if (!evidenceIds.has(id)) throw new Error(`Offset rule ${rule.id} references unknown evidence: ${id}`);
    if (rule.pathwayId) {
      const program = programs.find(({ id }) => id === rule.programId)!;
      const pathway = program.pathways?.find(({ id }) => id === rule.pathwayId);
      if (!pathway) throw new Error(`Offset rule ${rule.id} references unknown pathway: ${rule.pathwayId}`);
      if (pathway.default) throw new Error(`Offset rule ${rule.id} must leave pathwayId empty for the default pathway`);
      if (!pathway.subjects.includes(rule.subject)) throw new Error(`Offset rule ${rule.id} uses pathway ${rule.pathwayId} outside its subjects`);
    }
    const key = bandKey(rule);
    const claimed = covered.get(key) ?? new Map<number, string>();
    for (let index = rule.fromGradeIndex; index <= rule.toGradeIndex; index += 1) {
      const existing = claimed.get(index);
      if (existing) throw new Error(`Offset rules ${existing} and ${rule.id} both cover ${key} grade index ${index}`);
      claimed.set(index, rule.id);
    }
    covered.set(key, claimed);
  }

  for (const program of programs) {
    for (const [key, claimed] of covered) {
      if (!key.startsWith(`${program.id}/`) || !key.endsWith("/base")) continue;
      program.gradeLabels.forEach((label, index) => {
        if (label !== null && !claimed.has(index)) throw new Error(`${key} has no offset rule for grade index ${index}`);
      });
    }
    for (const subject of Object.keys(program.subjectNotes ?? {})) {
      if (rules.some((rule) => rule.programId === program.id && rule.subject === subject)) {
        throw new Error(`Program ${program.id} has both ${subject} rules and a subject scope note`);
      }
    }
  }

  const outcomeIds = new Set<string>();
  for (const outcome of outcomes) {
    if (outcomeIds.has(outcome.id)) throw new Error(`Duplicate outcome disclosure id: ${outcome.id}`);
    outcomeIds.add(outcome.id);
    if (!programIds.has(outcome.programId)) throw new Error(`Outcome ${outcome.id} references unknown program: ${outcome.programId}`);
    for (const id of outcome.evidenceIds) if (!evidenceIds.has(id)) throw new Error(`Outcome ${outcome.id} references unknown evidence: ${id}`);
    if (!outcome.denominator && !outcome.qualityFlags.includes("missing-denominator")) {
      throw new Error(`Outcome ${outcome.id} has no denominator but is not flagged`);
    }
  }

  const dataset = { programs, evidence, rules, outcomes };
  for (const subject of levelingSubjects) {
    const selections: Record<string, string>[] = [{}];
    for (const program of programs) {
      for (const pathway of program.pathways?.filter((candidate) => candidate.subjects.includes(subject) && !candidate.default) ?? []) {
        selections.push({ [program.id]: pathway.id });
      }
    }
    for (const selection of selections) {
      for (const column of buildLeveling(dataset, subject, programs.map(({ id }) => id), selection)) {
        column.cells.reduce<LevelingCell | null>((previous, cell) => {
          if (previous && cell.progressStart < previous.progressStart - 1e-9) {
            throw new Error(`${column.program.id}/${subject}/${column.pathway?.id ?? "base"}: ${cell.label} starts before ${previous.label} on the progress axis`);
          }
          return cell;
        }, null);
      }
    }
  }
  return dataset;
}

export function pathwaysFor(program: Program, subject: LevelingSubject): ProgramPathway[] {
  return program.pathways?.filter((pathway) => pathway.subjects.includes(subject)) ?? [];
}

export function defaultPathway(program: Program, subject: LevelingSubject): ProgramPathway | null {
  return pathwaysFor(program, subject).find((pathway) => pathway.default) ?? null;
}

export function buildLeveling(dataset: LevelingDataset, subject: LevelingSubject, programIds: string[], selectedPathways: Record<string, string> = {}): LevelingColumn[] {
  return programIds.flatMap<LevelingColumn>((programId) => {
    const program = dataset.programs.find(({ id }) => id === programId);
    if (!program) return [];
    const subjectRules = dataset.rules.filter((rule) => rule.programId === programId && rule.subject === subject);
    const choices = pathwaysFor(program, subject);
    const fallback = defaultPathway(program, subject);
    const pathway = choices.find(({ id }) => id === selectedPathways[programId]) ?? fallback;
    const baseRules = subjectRules.filter((rule) => !rule.pathwayId);
    const pathwayRules = pathway && !pathway.default ? subjectRules.filter((rule) => rule.pathwayId === pathway.id) : [];
    // Dropping the column would read as "this school does not exist". It stays,
    // and says which of the two it is.
    if (!subjectRules.length) return [{ program, cells: [], headlineOffset: 0, unresearched: true, pathway }];
    const cells = program.gradeLabels.flatMap<LevelingCell>((label, gradeIndex) => {
      const inBand = ({ fromGradeIndex, toGradeIndex }: OffsetRule) => gradeIndex >= fromGradeIndex && gradeIndex <= toGradeIndex;
      const rule = pathwayRules.find(inBand) ?? baseRules.find(inBand);
      if (label === null || !rule) return [];
      if (rule.coverage === "not-offered") {
        return [{
          programId, gradeIndex, label,
          progressStart: gradeIndex, progressEnd: gradeIndex + 1,
          offsetYears: 0, spanYears: 1,
          depth: rule.depth ?? "not-assessed",
          pace: rule.pace ?? "not-assessed",
          pathwayId: pathway?.id,
          confidence: rule.confidence,
          beyondScale: false, notOffered: true, rule,
        }];
      }
      const rawStart = gradeIndex + rule.offsetYears;
      const progressStart = Math.min(Math.max(rawStart, 0), TRACK_ROWS - rule.spanYears);
      const progressEnd = progressStart + rule.spanYears;
      return [{
        programId, gradeIndex, label, progressStart, progressEnd,
        offsetYears: rule.offsetYears,
        spanYears: rule.spanYears,
        depth: rule.depth ?? "not-assessed",
        pace: rule.pace ?? (rule.spanYears > 1 ? "faster" : "not-assessed"),
        pathwayId: pathway?.id,
        confidence: rule.confidence,
        beyondScale: progressEnd > AXIS_SIZE + 1e-9,
        notOffered: false,
        rule,
      }];
    });
    const spans = cells.filter((cell) => !cell.beyondScale);
    const headlineOffset = spans.length ? Math.max(...spans.map((cell) => cell.offsetYears)) : 0;
    return [{ program, cells, headlineOffset, unresearched: false, pathway }];
  });
}

export interface LayoutCell extends LevelingCell {
  top: number;
  height: number;
  stretched: boolean;
}

export interface LayoutColumn {
  program: Program;
  cells: LayoutCell[];
  headlineOffset: number;
  unresearched: boolean;
  pathway: ProgramPathway | null;
}

export interface AxisRow {
  index: number;
  top: number;
  height: number;
  beyond: boolean;
}

export interface MatrixLayout {
  columns: LayoutColumn[];
  rows: AxisRow[];
  totalHeight: number;
}

const EPS = 1e-9;

/**
 * Places every level on a shared vertical axis measured in Ontario-year units.
 *
 * Two adjustments keep the picture readable without moving any level off the
 * position its offset actually claims. A level after another taught level is
 * stretched backwards to meet its predecessor so a program's ladder reads as
 * a continuous column rather than a set of floating boxes. A jump after
 * explicit "not taught" years stays visible. Where one program puts two levels
 * on the same stretch of the axis, that stretch is given proportionally more
 * height and every other program's level across it grows to match, so
 * converging levels sit side by side without being drawn on top of each other.
 */
export function layoutMatrix(columns: LevelingColumn[]): MatrixLayout {
  const placements = columns.map((column) => {
    let previousEnd: number | null = null;
    let previousWasNotOffered = false;
    return column.cells.map((cell) => {
      // A jump after a taught level is drawn back to keep the curriculum ladder
      // continuous. A pathway beginning after explicit "not taught" years is
      // different: preserving that blank lead-in is what makes its earlier
      // content position visible (for example Immersion Grade 1 at Core Grade 4).
      const stretched = previousEnd !== null && !previousWasNotOffered && !cell.notOffered && cell.progressStart > previousEnd + EPS;
      const start = stretched ? (previousEnd as number) : cell.progressStart;
      const end = Math.max(cell.progressEnd, start);
      previousEnd = previousEnd === null ? end : Math.max(previousEnd, end);
      previousWasNotOffered = cell.notOffered;
      return { cell, start, end, stretched };
    });
  });

  // Levels that overlap each other form one cluster and are stacked inside the
  // cluster's whole block. Splitting them interval by interval instead would
  // let a level that spans several intervals wrap around its own neighbour.
  type Placement = (typeof placements)[number][number];
  const clusters = placements.map((items) => {
    const groups: { cells: Placement[]; start: number; end: number }[] = [];
    for (const item of items) {
      const current = groups[groups.length - 1];
      if (current && item.start < current.end - EPS) {
        current.cells.push(item);
        current.end = Math.max(current.end, item.end);
      } else {
        groups.push({ cells: [item], start: item.start, end: item.end });
      }
    }
    return groups;
  });

  // The axis carries spare rows past Grade 12 so an accelerated level has
  // somewhere to land, but drawing the ones nothing reaches leaves a band of
  // dead space under every column, so the axis stops at the deepest level.
  const deepest = Math.max(AXIS_SIZE, ...placements.flatMap((cells) => cells.map(({ end }) => Math.ceil(end - EPS))));
  const lastRow = Math.min(deepest, TRACK_ROWS);

  const points = new Set<number>();
  for (let row = 0; row <= lastRow; row += 1) points.add(row);
  for (const cells of placements) {
    for (const { start, end } of cells) {
      if (start > -EPS && start < lastRow + EPS) points.add(start);
      if (end > -EPS && end < lastRow + EPS) points.add(end);
    }
  }
  const bounds = [...points].sort((a, b) => a - b);

  const intervals: { start: number; end: number; top: number; height: number }[] = [];
  const yAt = new Map<number, number>();
  let cursor = 0;
  for (let index = 0; index < bounds.length - 1; index += 1) {
    const start = bounds[index];
    const end = bounds[index + 1];
    if (end - start < EPS) continue;
    const crowding = clusters.reduce((most, groups) => {
      const covering = groups.filter((group) => group.start < end - EPS && group.end > start + EPS);
      return covering.reduce((deepest, group) => Math.max(deepest, group.cells.length), most);
    }, 1);
    const height = (end - start) * crowding;
    yAt.set(start, cursor);
    intervals.push({ start, end, top: cursor, height });
    cursor += height;
    yAt.set(end, cursor);
  }

  const layoutColumns = columns.map((column, columnIndex) => {
    const positions = new Map<Placement, { top: number; height: number }>();
    for (const group of clusters[columnIndex]) {
      const blockTop = yAt.get(group.start) ?? group.start;
      const blockHeight = (yAt.get(group.end) ?? group.end) - blockTop;
      const totalSpan = group.cells.reduce((total, item) => total + (item.end - item.start), 0);
      let consumed = 0;
      for (const item of group.cells) {
        const share = totalSpan > EPS ? (item.end - item.start) / totalSpan : 1 / group.cells.length;
        positions.set(item, { top: blockTop + consumed * blockHeight, height: share * blockHeight });
        consumed += share;
      }
    }
    const cells = placements[columnIndex].map((item): LayoutCell => {
      const placed = positions.get(item);
      return { ...item.cell, stretched: item.stretched, top: placed?.top ?? item.start, height: placed?.height ?? item.end - item.start };
    });
    return { ...column, cells };
  });

  const rows = Array.from({ length: lastRow }, (_, index) => {
    const within = intervals.filter((interval) => interval.start > index - EPS && interval.end < index + 1 + EPS);
    return {
      index,
      top: within.length ? within[0].top : index,
      height: within.reduce((total, interval) => total + interval.height, 0) || 1,
      beyond: index >= AXIS_SIZE,
    };
  });

  return { columns: layoutColumns, rows, totalHeight: cursor || lastRow };
}

export function offsetLabel(offsetYears: number): string {
  if (offsetYears === 0) return "On Ontario timing";
  const rounded = Math.round(Math.abs(offsetYears) * 10) / 10;
  const unit = rounded === 1 ? "yr" : "yrs";
  return `${offsetYears > 0 ? "+" : "−"}${rounded} ${unit}`;
}

export function ontarioEquivalent(cell: LevelingCell): string {
  const startIndex = Math.floor(cell.progressStart + 1e-9);
  if (startIndex >= AXIS_SIZE) return BEYOND_LABEL;
  const endIndex = Math.min(Math.ceil(cell.progressEnd - 1e-9) - 1, AXIS_SIZE - 1);
  const band = startIndex >= endIndex ? ontarioGradeLabel(startIndex) : `${ontarioGradeLabel(startIndex)}–${ontarioGradeLabel(endIndex)}`;
  return cell.beyondScale ? `${band} and ${BEYOND_LABEL}` : band;
}

export const confidenceCopy: Record<ConfidenceTier, string> = {
  documented: "The school or curriculum authority publishes this structure directly.",
  approximate: "Derived from published structure, programme duration, or typical student age rather than a stated equivalency.",
  "community-reported": "Rests mainly on parent and student reports; treat it as a signal, not a placement decision.",
  "insufficient-evidence": "No public source establishes a pace difference, so the level is held at the Ontario position.",
};
