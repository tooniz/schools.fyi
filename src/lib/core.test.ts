import { describe, expect, it } from "vitest";
import { levelingDataset } from "@data/leveling";
import { expectations } from "@data/schools";
import { editorialAlignment, normalizeConcept } from "./comparison";
import { TRACK_ROWS, buildLeveling, layoutMatrix, offsetLabel, ontarioEquivalent, ontarioGradeLabel, validateLeveling } from "./leveling";
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
  it("round trips URL state", () => {
    const value = { subject: "french" as const, programs: ["ontario", "tfs"] };
    expect(parseState(new URLSearchParams(serializeState(value)), DEFAULT_PROGRAMS)).toEqual(value);
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
    expect(offsetLabel(0)).toBe("On Ontario pace");
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

  it("leaves no gap between consecutive levels of a program", () => {
    for (const subject of ["mathematics", "language", "french"] as const) {
      const { columns } = layoutMatrix(buildLeveling(levelingDataset, subject, levelingDataset.programs.map(({ id }) => id)));
      for (const column of columns) {
        column.cells.reduce<number | null>((previousBottom, cell) => {
          if (previousBottom !== null) expect(cell.top).toBeCloseTo(previousBottom, 6);
          return cell.top + cell.height;
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

  it("keeps Ontario pinned at zero offset across every subject", () => {
    const ontarioRules = levelingDataset.rules.filter((entry) => entry.programId === "ontario");
    expect(ontarioRules.length).toBeGreaterThan(0);
    expect(ontarioRules.every((entry) => entry.offsetYears === 0)).toBe(true);
  });

  it("requires at least one source behind every offset rule", () => {
    expect(levelingDataset.rules.every((entry) => entry.evidenceIds.length > 0)).toBe(true);
  });
});
