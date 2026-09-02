import type { Metadata } from "next";
import Link from "next/link";
import { confidenceCopy } from "@/lib/leveling";
import { countQuestions, openQuestions } from "@/lib/questions";
import { reportPath } from "@/lib/report";
import { kindLabels, subjectLabels } from "@/lib/schema";
import { levelingDataset } from "@data/leveling";
import { AdmitsGlyph } from "@/components/AdmitsGlyph";
import { FrameworkTag } from "@/components/FrameworkTag";


export const metadata: Metadata = {
  title: "Open questions — schools.fyi",
  description: "Every curriculum placement on this site that rests on weak evidence, and the document that would settle each one.",
};

export default function Questions() {
  const groups = openQuestions(levelingDataset);
  const total = countQuestions(groups);

  return (
    <main>
      <div className="hero">
        <p className="eyebrow">Where we are unsure</p>
        <h1>{total} placements need a better source.</h1>
        <p>
          Most of this site rests on documents the schools publish themselves. These {total} placements do not: they
          are inferred from programme structure, course sequencing, or student age, because nobody publishes the
          thing that would settle them. Each one below names the specific document we are missing.
        </p>
        <p>
          This list is generated from the data, not maintained by hand. A placement leaves it the moment a real
          source arrives.
        </p>
      </div>

      <div className="question-groups">
        {groups.map(({ program, questions }) => (
          <section className="question-group" key={program.id} data-kind={program.kind} data-framework={program.framework} data-scope={program.frameworkScope}>
            <header>
              <span>{kindLabels[program.kind]}<FrameworkTag framework={program.framework} scope={program.frameworkScope} /></span>
              <h2><Link href={`/program/${program.id}`}>{program.displayName}</Link><AdmitsGlyph admits={program.admits} /></h2>
              <p>{questions.length} open {questions.length === 1 ? "question" : "questions"}</p>
            </header>
            <ul>
              {questions.map(({ rule, subject, band, ask }) => (
                <li key={rule.id} data-confidence={rule.confidence}>
                  <p className="question-where">
                    <strong>{subjectLabels[subject]}</strong> · {band}
                    {rule.pathwayId && <> · <span className="pathway-chip">{program.pathways?.find(({ id }) => id === rule.pathwayId)?.label ?? rule.pathwayId}</span></>}
                    <em>{rule.confidence.replace("-", " ")}</em>
                  </p>
                  <p className="question-claim">{rule.claim}</p>
                  <p className="question-why">{confidenceCopy[rule.confidence]}</p>
                  <p className="question-ask">{ask}</p>
                  <Link href={reportPath({ program: program.id, subject, level: band, ask })}>Send us the source</Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="alignment-note">
        <strong>Why publish this?</strong> A comparison site that only showed its confident answers would be easier
        to trust and harder to correct. Every placement in the matrix carries its confidence tier for the same
        reason. If you can close one of these, it improves the answer for everyone who looks up that school.
      </p>
    </main>
  );
}
