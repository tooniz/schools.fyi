import { describe, expect, it } from "vitest";
import { levelingDataset } from "@data/leveling";
import { expectations } from "@data/schools";
import { editorialAlignment, normalizeConcept } from "./comparison";
import { buildLeveling, offsetLabel, ontarioEquivalent, ontarioGradeLabel, validateLeveling } from "./leveling";
import { gradeLevels } from "./schema";
import type { OffsetRule, Program } from "./schema";
import { DEFAULT_PROGRAMS, parseState, serializeState } from "./url-state";

const gradeLabels = ["JK", "SK", ...Array.from({ length: 12 }, (_, index) => `Grade ${index + 1}`)];
const program = (id: string): Program => ({
  id, name: id, shortName: id, kind: "independent-school", location: "Toronto", url: "https://example.com",
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
    expect([grade8.lane, grade9.lane]).toEqual([0, 1]);
  });

  it("moves a converging level into a second lane so both stay visible", () => {
    const dataset = validateLeveling({
      programs: [program("converging")],
      evidence,
      rules: [
        rule({ id: "r1", programId: "converging", fromGradeIndex: 0, toGradeIndex: 9, offsetYears: 0.5 }),
        rule({ id: "r2", programId: "converging", fromGradeIndex: 10, toGradeIndex: 13 }),
      ],
    });
    const [column] = buildLeveling(dataset, "mathematics", ["converging"]);
    expect(column.cells.find((cell) => cell.gradeIndex === 9)!.lane).toBe(0);
    expect(column.cells.find((cell) => cell.gradeIndex === 10)!.lane).toBe(1);
    expect(column.cells.find((cell) => cell.gradeIndex === 11)!.lane).toBe(0);
  });

  it("formats offsets for display", () => {
    expect(offsetLabel(0)).toBe("On Ontario pace");
    expect(offsetLabel(1)).toBe("+1 yr");
    expect(offsetLabel(0.5)).toBe("+0.5 yrs");
    expect(offsetLabel(-1)).toBe("−1 yr");
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
