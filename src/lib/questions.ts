import { ontarioGradeLabel, type LevelingDataset } from "./leveling";
import { isWeakPlacement, settlingAsk } from "./report";
import { levelingSubjects, subjectLabels, type LevelingSubject, type OffsetRule, type Program } from "./schema";

export interface OpenQuestion {
  rule: OffsetRule;
  subject: LevelingSubject;
  /** The band as the program itself names it, which is the point of the site. */
  band: string;
  ask: string;
}

export interface ProgramQuestions {
  program: Program;
  questions: OpenQuestion[];
}

/** A program's own label for a grade, falling back to the Ontario name. */
export function programGradeLabel(program: Program, gradeIndex: number): string {
  return program.gradeLabels[gradeIndex] ?? ontarioGradeLabel(gradeIndex);
}

export function bandLabel(program: Program, rule: OffsetRule): string {
  const from = programGradeLabel(program, rule.fromGradeIndex);
  const to = programGradeLabel(program, rule.toGradeIndex);
  return from === to ? from : `${from} – ${to}`;
}

/**
 * Every placement we would rather have a better source for, grouped by program.
 * Derived entirely from the dataset, so it cannot drift out of date: the moment a
 * rule is promoted to `documented`, it leaves this list.
 */
export function openQuestions(dataset: LevelingDataset): ProgramQuestions[] {
  return dataset.programs
    .map((program) => {
      const questions = levelingSubjects.flatMap((subject) =>
        dataset.rules
          .filter((rule) => rule.programId === program.id && rule.subject === subject && rule.coverage === "taught" && isWeakPlacement(rule.confidence))
          .map((rule) => {
            const band = bandLabel(program, rule);
            return { rule, subject, band, ask: settlingAsk(rule.confidence, program.displayName, subjectLabels[subject], band) };
          }),
      );
      return { program, questions };
    })
    .filter(({ questions }) => questions.length > 0);
}

export function countQuestions(groups: ProgramQuestions[]): number {
  return groups.reduce((total, group) => total + group.questions.length, 0);
}
