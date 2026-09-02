import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { levelingDataset } from "@data/leveling";
import { expectations } from "@data/schools";
import { editorialAlignment, normalizeConcept } from "./comparison";
import { formatAccessDate, isStale, staleEvidence } from "./freshness";
import { TRACK_ROWS, buildLeveling, layoutMatrix, offsetLabel, ontarioEquivalent, ontarioGradeLabel, validateLeveling, type LayoutCell } from "./leveling";
import { bandLabel, countQuestions, openQuestions, programGradeLabel } from "./questions";
import { isWeakPlacement, reportPath, settlingAsk } from "./report";
import { gradeLevels } from "./schema";
import type { OffsetRule, Program } from "./schema";
import { DEFAULT_PROGRAMS, parseState, serializeState } from "./url-state";

const gradeLabels = ["JK", "SK", ...Array.from({ length: 12 }, (_, index) => `Grade ${index + 1}`)];
const program = (id: string): Program => ({
  id, name: id, displayName: id, abbreviation: id, kind: "independent-school", location: "Toronto", url: "https://example.com",
  descriptor: "Test program", methodology: "Test methodology", gradeLabels, evidenceIds: ["e1"],
});
const rule = (overrides: Partial<OffsetRule> & { id: string; programId: string }): OffsetRule => ({
  subject: "mathematics", fromGradeIndex: 0, toGradeIndex: 13, coverage: "taught", offsetYears: 0, spanYears: 1,
  confidence: "documented", claim: "Test claim", rationale: "Test rationale", evidenceIds: ["e1"], ...overrides,
});
const evidence = [{ id: "e1", kind: "school-published" as const, publisher: "Test", title: "Test", canonicalUrl: "https://example.com", accessDate: "2026-09-01" }];

describe("comparison domain", () => {
  it("keeps canonical grade ordering", () => expect(gradeLevels).toEqual(["JK", "SK", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]));
  it("normalizes broad concepts", () => expect(normalizeConcept("spatial geometry")).toBe("geometry"));
  it("labels mappings as editorial confidence", () => expect(editorialAlignment(expectations[0], expectations[2])).toBe("direct"));
  it("uses default selections", () => expect(parseState(new URLSearchParams(), DEFAULT_PROGRAMS).programs).toEqual(DEFAULT_PROGRAMS));
  it("orders the default comparison by the selected Trends ranking", () => {
    expect(DEFAULT_PROGRAMS).toEqual(["ontario", "bayview-glen", "ucc", "havergal", "branksome"]);
  });
  it("round trips URL state", () => {
    const value = {
      subject: "french" as const,
      programs: ["ontario", "tfs"],
      pathways: { ontario: "french-immersion" },
      outcomes: true,
    };
    expect(parseState(new URLSearchParams(serializeState(value)), ["ontario", "tfs"])).toEqual(value);
  });
});

describe("leveling axis", () => {
  it("labels Ontario progress rows", () => {
    expect(ontarioGradeLabel(0)).toBe("JK");
    expect(ontarioGradeLabel(6)).toBe("Grade 5");
  });

  it("shifts an accelerated level onto a later Ontario row", () => {
    const dataset = validateLeveling({ programs: [program("accelerated")], evidence, rules: [rule({ id: "r1", programId: "accelerated", offsetYears: 1 })] });
    const [column] = buildLeveling(dataset, "mathematics", ["accelerated"]);
    const grade5 = column.cells.find((cell) => cell.label === "Grade 5");
    expect(grade5?.progressStart).toBe(7);
    expect(ontarioEquivalent(grade5!)).toBe("Grade 6");
    expect(column.headlineOffset).toBe(1);
  });

  it("straddles two Ontario rows for a half-year offset", () => {
    const dataset = validateLeveling({ programs: [program("half")], evidence, rules: [rule({ id: "r1", programId: "half", offsetYears: 0.5 })] });
    const [column] = buildLeveling(dataset, "mathematics", ["half"]);
    const grade4 = column.cells.find((cell) => cell.label === "Grade 4")!;
    expect(grade4.progressStart).toBe(5.5);
    expect(ontarioEquivalent(grade4)).toBe("Grade 4–Grade 5");
  });

  it("flags senior levels pushed past the Ontario endpoint", () => {
    const dataset = validateLeveling({ programs: [program("ahead")], evidence, rules: [rule({ id: "r1", programId: "ahead", offsetYears: 1 })] });
    const [column] = buildLeveling(dataset, "mathematics", ["ahead"]);
    const grade12 = column.cells.find((cell) => cell.label === "Grade 12")!;
    expect(grade12.beyondScale).toBe(true);
    expect(grade12.progressStart).toBe(14);
    expect(ontarioEquivalent(grade12)).toBe("beyond Grade 12");
    expect(ontarioEquivalent(column.cells.find((cell) => cell.label === "Grade 11")!)).toBe("Grade 12");
  });

  it("marks levels a program does not teach instead of dropping them", () => {
    const dataset = validateLeveling({
      programs: [program("late-french")],
      evidence,
      rules: [
        rule({ id: "r1", programId: "late-french", subject: "french", fromGradeIndex: 0, toGradeIndex: 4, coverage: "not-offered" }),
        rule({ id: "r2", programId: "late-french", subject: "french", fromGradeIndex: 5, toGradeIndex: 13 }),
      ],
    });
    const [column] = buildLeveling(dataset, "french", ["late-french"]);
    expect(column.cells).toHaveLength(14);
    expect(column.cells.filter((cell) => cell.notOffered).map((cell) => cell.label)).toEqual(["JK", "SK", "Grade 1", "Grade 2", "Grade 3"]);
    expect(column.cells.find((cell) => cell.label === "Grade 4")!.notOffered).toBe(false);
  });

  it("stretches a compressed level across more than one Ontario row", () => {
    const dataset = validateLeveling({
      programs: [program("compressed")],
      evidence,
      rules: [
        rule({ id: "r1", programId: "compressed", fromGradeIndex: 0, toGradeIndex: 6 }),
        rule({ id: "r2", programId: "compressed", fromGradeIndex: 7, toGradeIndex: 7, spanYears: 1.5 }),
        rule({ id: "r3", programId: "compressed", fromGradeIndex: 8, toGradeIndex: 8, offsetYears: 0.5, spanYears: 1.5 }),
        rule({ id: "r4", programId: "compressed", fromGradeIndex: 9, toGradeIndex: 13, offsetYears: 1 }),
      ],
    });
    const [column] = buildLeveling(dataset, "mathematics", ["compressed"]);
    const grade6 = column.cells.find((cell) => cell.label === "Grade 6")!;
    expect([grade6.progressStart, grade6.progressEnd]).toEqual([7, 8.5]);
    expect(ontarioEquivalent(grade6)).toBe("Grade 6–Grade 7");
    expect(column.cells.find((cell) => cell.label === "Grade 8")!.progressStart).toBe(10);
  });

  it("rejects a ladder whose levels run backwards", () => {
    expect(() => validateLeveling({
      programs: [program("inverted")],
      evidence,
      rules: [
        rule({ id: "r1", programId: "inverted", fromGradeIndex: 0, toGradeIndex: 6, offsetYears: 2 }),
        rule({ id: "r2", programId: "inverted", fromGradeIndex: 7, toGradeIndex: 13 }),
      ],
    })).toThrow(/starts before/);
  });

  it("allows two consecutive years to land on the same level", () => {
    const dataset = validateLeveling({
      programs: [program("converged")],
      evidence,
      rules: [
        rule({ id: "r1", programId: "converged", fromGradeIndex: 0, toGradeIndex: 9, offsetYears: 1 }),
        rule({ id: "r2", programId: "converged", fromGradeIndex: 10, toGradeIndex: 13 }),
      ],
    });
    const [column] = buildLeveling(dataset, "mathematics", ["converged"]);
    const grade8 = column.cells.find((cell) => cell.gradeIndex === 9)!;
    const grade9 = column.cells.find((cell) => cell.gradeIndex === 10)!;
    expect(grade8.progressStart).toBe(grade9.progressStart);
  });

  it("formats offsets for display", () => {
    expect(offsetLabel(0)).toBe("On Ontario timing");
    expect(offsetLabel(1)).toBe("+1 yr");
    expect(offsetLabel(0.5)).toBe("+0.5 yrs");
    expect(offsetLabel(-1)).toBe("−1 yr");
  });
});

describe("matrix layout", () => {
  const jump = validateLeveling({
    programs: [program("ontario-like"), program("jumps")],
    evidence,
    rules: [
      rule({ id: "base", programId: "ontario-like" }),
      rule({ id: "j1", programId: "jumps", fromGradeIndex: 0, toGradeIndex: 0 }),
      rule({ id: "j2", programId: "jumps", fromGradeIndex: 1, toGradeIndex: 13, offsetYears: 1 }),
    ],
  });

  it("stretches a level back to close the gap its jump would leave", () => {
    const { columns } = layoutMatrix(buildLeveling(jump, "mathematics", ["ontario-like", "jumps"]));
    const [, accelerated] = columns;
    const jk = accelerated.cells[0];
    const sk = accelerated.cells[1];
    expect(jk.stretched).toBe(false);
    expect(sk.stretched).toBe(true);
    expect(sk.top).toBeCloseTo(jk.top + jk.height);
    expect(sk.height).toBeCloseTo(2 * jk.height);
  });

  it("keeps the stretched level's claim at its real position", () => {
    const [, accelerated] = buildLeveling(jump, "mathematics", ["ontario-like", "jumps"]);
    expect(ontarioEquivalent(accelerated.cells[1])).toBe("Grade 1");
  });

  it("gives a crowded stretch more height and grows every other column across it", () => {
    const dataset = validateLeveling({
      programs: [program("steady"), program("converged")],
      evidence,
      rules: [
        rule({ id: "s1", programId: "steady" }),
        rule({ id: "c1", programId: "converged", fromGradeIndex: 0, toGradeIndex: 9, offsetYears: 1 }),
        rule({ id: "c2", programId: "converged", fromGradeIndex: 10, toGradeIndex: 13 }),
      ],
    });
    const { columns, rows } = layoutMatrix(buildLeveling(dataset, "mathematics", ["steady", "converged"]));
    const [steady, converged] = columns;
    const grade8 = converged.cells.find((cell) => cell.gradeIndex === 9)!;
    const grade9 = converged.cells.find((cell) => cell.gradeIndex === 10)!;
    const partner = steady.cells.find((cell) => cell.gradeIndex === 10)!;

    expect(grade9.top).toBeCloseTo(grade8.top + grade8.height);
    expect(rows[10].height).toBe(2);
    expect(partner.height).toBeCloseTo(grade8.height + grade9.height);
    expect(partner.top).toBeCloseTo(grade8.top);
  });

  it("spends UTS's first year on two Ontario years, then holds a full grade of lead", () => {
    const { columns } = layoutMatrix(buildLeveling(levelingDataset, "mathematics", ["ontario", "uts"]));
    const uts = new Map(columns[1].cells.map((cell) => [cell.label, cell]));
    expect(ontarioEquivalent(uts.get("Grade 7")!)).toBe("Grade 7–Grade 8");
    expect(uts.get("Grade 8")!.offsetYears).toBe(1);
    expect(ontarioEquivalent(uts.get("Grade 11")!)).toBe("Grade 12");
    // The lead buys depth rather than an early finish, so the last two years land together.
    expect(ontarioEquivalent(uts.get("Grade 12")!)).toBe("Grade 12");
    expect(uts.get("Grade 12")!.top).toBeCloseTo(uts.get("Grade 11")!.top + uts.get("Grade 11")!.height);
  });

  it("keeps UTS English level with Ontario even though its maths runs ahead", () => {
    const { columns } = layoutMatrix(buildLeveling(levelingDataset, "language", ["ontario", "uts"]));
    for (const cell of columns[1].cells) {
      expect(cell.offsetYears).toBe(0);
      expect(cell.confidence).toBe("documented");
    }
  });

  it("holds RHMS level with Ontario and stops it after Grade 8", () => {
    const { columns } = layoutMatrix(buildLeveling(levelingDataset, "mathematics", ["ontario", "rhms"]));
    const [ontario, rhms] = columns;
    expect(rhms.cells.every((cell) => cell.offsetYears === 0)).toBe(true);
    expect(rhms.cells[rhms.cells.length - 1].label).toBe("Grade 8");
    for (const cell of rhms.cells) {
      const counterpart = ontario.cells[cell.gradeIndex];
      expect(cell.top).toBeCloseTo(counterpart.top);
      expect(cell.height).toBeCloseTo(counterpart.height);
    }
  });

  it("starts RHMS French in Grade 4, the same year Ontario does", () => {
    const { columns } = layoutMatrix(buildLeveling(levelingDataset, "french", ["ontario", "rhms"]));
    const [ontario, rhms] = columns;
    const firstTaught = (cells: typeof ontario.cells) => cells.find((cell) => !cell.notOffered)?.gradeIndex;
    expect(firstTaught(rhms.cells)).toBe(firstTaught(ontario.cells));
    expect(ontarioGradeLabel(firstTaught(rhms.cells)!)).toBe("Grade 4");
  });

  it("only draws rows past Grade 12 when a level actually reaches them", () => {
    const onPace = layoutMatrix(buildLeveling(levelingDataset, "mathematics", ["ontario", "rhms"]));
    expect(onPace.rows.some((row) => row.beyond)).toBe(false);
    const accelerated = layoutMatrix(buildLeveling(levelingDataset, "mathematics", ["ontario", "tfs"]));
    expect(accelerated.rows.some((row) => row.beyond)).toBe(true);
    expect(accelerated.rows.length).toBeLessThanOrEqual(TRACK_ROWS);
  });

  // Queen's maps AP Calculus BC and IB HL Mathematics to the same first-year
  // course, AP and IB French to the same one, and refuses credit for both
  // English routes. One registrar, one year, so neither framework may be shown
  // leading the other on the strength of a single university's table.
  it("finishes AP and IB level with each other, and holds English back in both", () => {
    const senior = (subject: "mathematics" | "language" | "french", program: string) => {
      const { columns } = layoutMatrix(buildLeveling(levelingDataset, subject, [program]));
      const cells = columns[0].cells;
      return cells[cells.length - 1].offsetYears;
    };
    for (const subject of ["mathematics", "language", "french"] as const) {
      expect(senior(subject, "advanced-placement")).toBe(senior(subject, "international-baccalaureate"));
    }
    for (const program of ["advanced-placement", "international-baccalaureate"]) {
      expect(senior("language", program)).toBeLessThan(senior("mathematics", program));
      expect(senior("language", program)).toBeLessThan(senior("french", program));
    }
  });

  it("never lets two levels of one program overlap", () => {
    const { columns } = layoutMatrix(buildLeveling(levelingDataset, "mathematics", levelingDataset.programs.map(({ id }) => id)));
    for (const column of columns) {
      column.cells.reduce<number | null>((previousBottom, cell) => {
        if (previousBottom !== null) expect(cell.top).toBeGreaterThanOrEqual(previousBottom - 1e-6);
        return cell.top + cell.height;
      }, null);
    }
  });

  it("leaves no gap after a taught level, while preserving a pathway lead-in after absence", () => {
    for (const subject of ["mathematics", "language", "french"] as const) {
      const { columns } = layoutMatrix(buildLeveling(levelingDataset, subject, levelingDataset.programs.map(({ id }) => id)));
      for (const column of columns) {
        column.cells.reduce<LayoutCell | null>((previous, cell) => {
          if (previous && !previous.notOffered) expect(cell.top).toBeCloseTo(previous.top + previous.height, 6);
          return cell;
        }, null);
      }
    }
  });
});

describe("leveling validation", () => {
  it("rejects overlapping bands for the same program and subject", () => {
    expect(() => validateLeveling({
      programs: [program("dup")],
      evidence,
      rules: [rule({ id: "r1", programId: "dup" }), rule({ id: "r2", programId: "dup", fromGradeIndex: 4, toGradeIndex: 6 })],
    })).toThrow(/both cover/);
  });

  it("rejects grade bands with no offset rule", () => {
    expect(() => validateLeveling({
      programs: [program("gap")],
      evidence,
      rules: [rule({ id: "r1", programId: "gap", fromGradeIndex: 0, toGradeIndex: 6 })],
    })).toThrow(/no offset rule for grade index 7/);
  });

  it("rejects unknown evidence references", () => {
    expect(() => validateLeveling({
      programs: [program("orphan")],
      evidence,
      rules: [rule({ id: "r1", programId: "orphan", evidenceIds: ["missing"] })],
    })).toThrow(/unknown evidence/);
  });

  it("rejects a not-offered band that also claims an offset", () => {
    expect(() => validateLeveling({
      programs: [program("bad")],
      evidence,
      rules: [rule({ id: "r1", programId: "bad", coverage: "not-offered", offsetYears: 1 })],
    })).toThrow(/not offered yet carries an offset/);
  });

  it("keeps Ontario Core pinned at zero while allowing FSL pathway crosswalks", () => {
    const ontarioRules = levelingDataset.rules.filter((entry) => entry.programId === "ontario" && !entry.pathwayId);
    expect(ontarioRules.length).toBeGreaterThan(0);
    expect(ontarioRules.every((entry) => entry.offsetYears === 0)).toBe(true);
    expect(levelingDataset.rules.some((entry) => entry.programId === "ontario" && entry.pathwayId === "french-immersion" && entry.offsetYears > 0)).toBe(true);
  });

  it("requires at least one source behind every offset rule", () => {
    expect(levelingDataset.rules.every((entry) => entry.evidenceIds.length > 0)).toBe(true);
  });

  it("rejects an alternative rule that names an unknown pathway", () => {
    expect(() => validateLeveling({
      programs: [program("bad-pathway")],
      evidence,
      rules: [rule({ id: "r1", programId: "bad-pathway", pathwayId: "missing" })],
    })).toThrow(/unknown pathway/);
  });
});

describe("pathways and separate dimensions", () => {
  it("switches Ontario French pathways without changing mathematics", () => {
    const coreFrench = buildLeveling(levelingDataset, "french", ["ontario"])[0];
    const immersionFrench = buildLeveling(levelingDataset, "french", ["ontario"], { ontario: "french-immersion" })[0];
    expect(coreFrench.cells.find((cell) => cell.gradeIndex === 2)?.notOffered).toBe(true);
    expect(immersionFrench.cells.find((cell) => cell.gradeIndex === 2)?.notOffered).toBe(false);
    expect(immersionFrench.cells.find((cell) => cell.gradeIndex === 2)?.offsetYears).toBe(3);
    expect(immersionFrench.cells.find((cell) => cell.gradeIndex === 5)?.offsetYears).toBe(2.5);
    expect(immersionFrench.pathway?.label).toBe("French Immersion");

    const regularMath = buildLeveling(levelingDataset, "mathematics", ["ontario"])[0];
    const selectedMath = buildLeveling(levelingDataset, "mathematics", ["ontario"], { ontario: "french-immersion" })[0];
    expect(selectedMath.cells.map((cell) => cell.offsetYears)).toEqual(regularMath.cells.map((cell) => cell.offsetYears));
  });

  it("visibly places Immersion Grade 1 at the Core Grade 4 position", () => {
    const core = buildLeveling(levelingDataset, "french", ["ontario"])[0];
    const immersion = buildLeveling(levelingDataset, "french", ["ontario"], { ontario: "french-immersion" })[0];
    const { columns } = layoutMatrix([core, immersion]);
    const coreGrade4 = columns[0].cells.find((cell) => cell.gradeIndex === 5)!;
    const immersionGrade1 = columns[1].cells.find((cell) => cell.gradeIndex === 2)!;
    expect(immersionGrade1.stretched).toBe(false);
    expect(immersionGrade1.top).toBeCloseTo(coreGrade4.top);
  });

  it("keeps York's core timing separate from its reach-ahead mathematics", () => {
    const core = buildLeveling(levelingDataset, "mathematics", ["york-school"])[0];
    const accelerated = buildLeveling(levelingDataset, "mathematics", ["york-school"], { "york-school": "accelerated-math" })[0];
    expect(core.cells.find((cell) => cell.gradeIndex === 9)?.offsetYears).toBe(0);
    expect(accelerated.cells.find((cell) => cell.gradeIndex === 9)?.offsetYears).toBe(1);
    expect(accelerated.pathway?.kind).toBe("reach-ahead");
  });

  it("does not infer depth from an earlier content-timing offset", () => {
    const dataset = validateLeveling({
      programs: [program("separate")],
      evidence,
      rules: [rule({ id: "r1", programId: "separate", offsetYears: 1, depth: "on-standard", pace: "on-standard" })],
    });
    const [cell] = buildLeveling(dataset, "mathematics", ["separate"])[0].cells;
    expect(cell.offsetYears).toBe(1);
    expect(cell.depth).toBe("on-standard");
    expect(cell.pace).toBe("on-standard");
  });
});

describe("outcomes disclosures", () => {
  it("ships university context without pretending private-school EQAO is public", () => {
    expect(levelingDataset.outcomes.length).toBeGreaterThan(0);
    expect(levelingDataset.outcomes.some(({ id }) => id.toLowerCase().includes("eqao"))).toBe(false);
    expect(levelingDataset.evidence.some(({ id }) => id === "ontario-eqao-private-exclusion")).toBe(true);
  });

  it("flags every missing cohort denominator explicitly", () => {
    for (const outcome of levelingDataset.outcomes) {
      if (!outcome.denominator) expect(outcome.qualityFlags, outcome.id).toContain("missing-denominator");
    }
  });
});

describe("unresearched subjects", () => {
  const dataset = () => validateLeveling({
    programs: [program("math-only")],
    evidence,
    rules: [rule({ id: "r1", programId: "math-only", subject: "mathematics" })],
  });

  it("keeps the column and says the data is missing rather than dropping the school", () => {
    const [column] = buildLeveling(dataset(), "science", ["math-only"]);
    expect(column).toBeDefined();
    expect(column.program.id).toBe("math-only");
    expect(column.unresearched).toBe(true);
    expect(column.cells).toEqual([]);
  });

  it("does not flag a subject that actually has rules", () => {
    const [column] = buildLeveling(dataset(), "mathematics", ["math-only"]);
    expect(column.unresearched).toBe(false);
    expect(column.cells.length).toBeGreaterThan(0);
  });

  it("still lays out an axis when every column is unresearched", () => {
    const { rows, columns } = layoutMatrix(buildLeveling(dataset(), "french", ["math-only"]));
    expect(columns).toHaveLength(1);
    expect(rows.length).toBeGreaterThan(0);
  });
});

describe("report routing", () => {
  it("carries the clicked cell into the form", () => {
    const path = reportPath({ program: "uts", subject: "mathematics", level: "Grade 8" });
    const params = new URLSearchParams(path.split("?")[1]);
    expect(path.startsWith("/contribute?")).toBe(true);
    expect(params.get("program")).toBe("uts");
    expect(params.get("subject")).toBe("mathematics");
    expect(params.get("level")).toBe("Grade 8");
  });

  it("omits empty context instead of sending blank keys", () => {
    expect(reportPath()).toBe("/contribute");
    expect(reportPath({ program: "uts", level: "" })).toBe("/contribute?program=uts");
  });

  it("treats everything short of documented as worth a source", () => {
    expect(isWeakPlacement("documented")).toBe(false);
    expect(isWeakPlacement("approximate")).toBe(true);
    expect(isWeakPlacement("community-reported")).toBe(true);
    expect(isWeakPlacement("insufficient-evidence")).toBe(true);
  });

  it("asks for the document that would settle the placement", () => {
    expect(settlingAsk("insufficient-evidence", "UTS", "Mathematics", "Grade 8")).toMatch(/No public source establishes/);
    expect(settlingAsk("community-reported", "UTS", "Mathematics", "Grade 8")).toMatch(/parent and student reports/);
    expect(settlingAsk("approximate", "UTS", "Mathematics", "Grade 8")).toMatch(/inferred from programme structure/);
  });
});

describe("source freshness", () => {
  const now = new Date("2026-09-01T00:00:00Z");

  it("passes a source read within the year", () => {
    expect(isStale("2026-08-01", now)).toBe(false);
    expect(isStale("2025-09-01", now)).toBe(false);
  });

  it("flags a source not re-read in over a year", () => {
    expect(isStale("2025-08-31", now)).toBe(true);
    expect(isStale("2020-01-01", now)).toBe(true);
  });

  it("reads dates as UTC so a timezone cannot shift the day", () => {
    expect(formatAccessDate("2026-09-01")).toBe("Sep 1, 2026");
  });

  it("keeps every shipped source inside the re-check window", () => {
    expect(staleEvidence(levelingDataset.evidence, now)).toEqual([]);
  });
});

describe("open questions", () => {
  it("lists only taught placements that fall short of documented", () => {
    const groups = openQuestions(levelingDataset);
    for (const { questions } of groups) {
      for (const { rule: entry } of questions) {
        expect(entry.coverage).toBe("taught");
        expect(entry.confidence).not.toBe("documented");
      }
    }
    expect(countQuestions(groups)).toBeGreaterThan(0);
  });

  it("counts exactly the weak taught rules in the dataset", () => {
    const expected = levelingDataset.rules.filter((entry) => entry.coverage === "taught" && entry.confidence !== "documented").length;
    expect(countQuestions(openQuestions(levelingDataset))).toBe(expected);
  });

  it("names a band using the program's own label, not Ontario's", () => {
    const tfs = levelingDataset.programs.find(({ id }) => id === "tfs")!;
    const rules = levelingDataset.rules.filter((entry) => entry.programId === "tfs");
    const compressed = rules.find((entry) => entry.spanYears !== 1);
    if (compressed) expect(bandLabel(tfs, compressed)).toContain(tfs.gradeLabels[compressed.fromGradeIndex]);
    expect(programGradeLabel(tfs, 9)).toBe("Grade 8 · Level I");
  });

  it("falls back to the Ontario label where a program has none", () => {
    const uts = levelingDataset.programs.find(({ id }) => id === "uts")!;
    expect(uts.gradeLabels[0]).toBeNull();
    expect(programGradeLabel(uts, 0)).toBe("JK");
  });
});

describe("server and client module boundary", () => {
  const appDir = path.join(import.meta.dirname, "..", "app");

  function walk(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(full);
      return entry.name.endsWith(".tsx") ? [full] : [];
    });
  }

  /** A plain value exported from a "use client" module reaches a server
   *  component as a client reference, so reading a key off it silently yields
   *  undefined and the label renders blank. Components are fine; data is not. */
  it("never reads a plain value out of a client component from a page", () => {
    const offenders: string[] = [];
    for (const file of walk(appDir)) {
      const source = readFileSync(file, "utf8");
      if (source.startsWith('"use client"')) continue;
      for (const [, names, from] of source.matchAll(/import\s+\{([^}]+)\}\s+from\s+"(@\/components\/[^"]+)"/g)) {
        const target = path.join(import.meta.dirname, "..", `${from.replace("@/", "")}.tsx`);
        if (!existsSync(target) || !readFileSync(target, "utf8").startsWith('"use client"')) continue;
        const values = names.split(",").map((name) => name.trim()).filter((name) => name && !name.startsWith("type ") && !/^[A-Z]/.test(name));
        if (values.length) offenders.push(`${path.basename(file)} imports ${values.join(", ")} from ${from}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("program categories", () => {
  it("gives Kumon its own category rather than filing it with AP and IB", () => {
    const kumon = levelingDataset.programs.find(({ id }) => id === "kumon")!;
    expect(kumon.kind).toBe("enrichment-program");
    expect(kumon.location).toBe("Canada");
    expect(kumon.framework).toBeUndefined();
  });

  it("tags every school that delivers the IB or AP, and no framework itself", () => {
    const tags = Object.fromEntries(levelingDataset.programs.map((program) => [program.id, [program.framework, program.frameworkScope].join("/")]));
    for (const id of ["branksome", "ucc", "tfs", "tms", "york-school"]) expect(tags[id], id).toBe("ib/curriculum");
    for (const id of ["uts", "crescent", "st-michaels", "appleby", "bayview-glen", "havergal", "bishop-strachan"]) expect(tags[id], id).toBe("ap/courses");
    for (const id of ["ontario", "rhms", "kumon", "international-baccalaureate", "advanced-placement"]) expect(tags[id], id).toBe("/");
  });

  /** Every AP school here teaches the Ontario curriculum and offers AP as senior
   *  electives. Letting one badge stand for both would make three electives
   *  look like an IB continuum. */
  it("never claims a school runs AP as its own curriculum", () => {
    const overclaimed = levelingDataset.programs.filter(({ framework, frameworkScope }) => framework === "ap" && frameworkScope === "curriculum");
    expect(overclaimed.map(({ id }) => id)).toEqual([]);
  });

  it("refuses a framework stated without how far it reaches", () => {
    const programs = levelingDataset.programs.map((program) => (program.id === "havergal" ? { ...program, frameworkScope: undefined } : program));
    expect(() => validateLeveling({ programs, evidence: levelingDataset.evidence, rules: levelingDataset.rules })).toThrow(/must state a framework and how far it reaches/);
  });

  it("refuses a framework tag on anything that is not a school", () => {
    const [first, ...rest] = levelingDataset.programs;
    const ib = levelingDataset.programs.find(({ id }) => id === "international-baccalaureate")!;
    expect(() =>
      validateLeveling({ programs: [{ ...ib, framework: "ib" }, first, ...rest], evidence: levelingDataset.evidence, rules: levelingDataset.rules }),
    ).toThrow(/cannot also carry the IB tag/);
  });

  it("keeps every framework claim backed by a source on the program itself", () => {
    for (const program of levelingDataset.programs.filter(({ framework }) => framework)) {
      expect(program.evidenceIds.length, program.id).toBeGreaterThan(0);
      expect(program.descriptor, program.id).toMatch(/IB|AP|Montessori/);
    }
  });
});

describe("science subject", () => {
  it("gives Ontario a science rule for every grade, so other columns have a reference", () => {
    const ontario = levelingDataset.programs.find(({ id }) => id === "ontario")!;
    const cells = buildLeveling(levelingDataset, "science", ["ontario"])[0].cells;
    expect(cells).toHaveLength(ontario.gradeLabels.length);
    for (const cell of cells) expect(cell.offsetYears).toBe(0);
  });

  it("lands incrementally: some programs carry science and others say so plainly", () => {
    const columns = buildLeveling(levelingDataset, "science", levelingDataset.programs.map(({ id }) => id));
    const researched = columns.filter(({ unresearched }) => !unresearched);
    const pending = columns.filter(({ unresearched }) => unresearched);
    expect(researched.length).toBeGreaterThan(1);
    expect(pending.length).toBeGreaterThan(0);
    for (const column of pending) expect(column.cells).toHaveLength(0);
  });

  it("puts UTS science a year up in the middle years, matching its course-code evidence", () => {
    const middle = levelingDataset.rules.find(({ id }) => id === "uts-science-middle")!;
    expect(middle.offsetYears).toBe(1);
    expect(middle.confidence).toBe("documented");
    expect(middle.evidenceIds).toContain("uts-calendar-science");
  });
});

describe("newly added programs", () => {
  const added = ["branksome", "ucc", "crescent", "st-michaels", "appleby", "tms", "kumon", "york-school", "spirit-of-math", "singapore-math"];

  it("registers every one of them with a resolvable set of sources", () => {
    for (const id of added) {
      const program = levelingDataset.programs.find((entry) => entry.id === id);
      expect(program, id).toBeDefined();
      expect(program!.evidenceIds.length, id).toBeGreaterThan(0);
    }
  });

  it("marks the single-sex schools so the glyph has something to render", () => {
    const admits = Object.fromEntries(levelingDataset.programs.map(({ id, admits: value }) => [id, value]));
    expect(admits.branksome).toBe("girls");
    expect(admits.ucc).toBe("boys");
    expect(admits.crescent).toBe("boys");
    expect(admits["st-michaels"]).toBe("boys");
    expect(admits.appleby).toBe("coed");
  });

  it("keeps Kumon's above-grade claim out of the offset and in the pathway", () => {
    const rules = levelingDataset.rules.filter(({ programId }) => programId === "kumon");
    const taught = rules.filter(({ coverage }) => coverage === "taught");
    for (const rule of taught) {
      expect(rule.offsetYears, rule.id).toBe(0);
      expect(rule.acceleratedPathway, rule.id).toBeTruthy();
    }
    for (const subject of ["french", "science"] as const) {
      expect(rules.filter((rule) => rule.subject === subject).every(({ coverage }) => coverage === "not-offered")).toBe(true);
    }
  });

  it("classifies the two new math comparators by what they are", () => {
    expect(levelingDataset.programs.find(({ id }) => id === "spirit-of-math")?.kind).toBe("enrichment-program");
    expect(levelingDataset.programs.find(({ id }) => id === "singapore-math")?.kind).toBe("public-curriculum");
  });

  it("holds Branksome English and science level in the same year it reaches ahead in mathematics", () => {
    const at = (subject: string, grade: number) =>
      levelingDataset.rules.find(
        (rule) => rule.programId === "branksome" && rule.subject === subject && rule.fromGradeIndex <= grade && rule.toGradeIndex >= grade,
      )!;
    expect(at("mathematics", 9).offsetYears).toBe(1);
    expect(at("language", 9).offsetYears).toBe(0);
    expect(at("science", 9).offsetYears).toBe(0);
    expect(at("language", 9).confidence).toBe("documented");
  });
});
