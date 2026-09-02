import type { Metadata } from "next";
import Link from "next/link";
import { formatAccessDate, isStale, staleEvidence } from "@/lib/freshness";
import { evidenceKinds, type Evidence } from "@/lib/schema";
import { levelingDataset } from "@data/leveling";

export const metadata: Metadata = {
  title: "Sources — schools.fyi",
  description: "Every source behind the curriculum leveling on this site, with publisher, quote, and the date it was read.",
};

const KIND_COPY: Record<(typeof evidenceKinds)[number], { title: string; blurb: string }> = {
  "official-curriculum": {
    title: "Official curriculum",
    blurb: "Published by the curriculum authority. These define the axis everything else is measured against.",
  },
  "school-published": {
    title: "School-published",
    blurb: "The school's own description of its program. Primary, but promotional in tone, so pace claims are weighed rather than quoted as fact.",
  },
  "school-course-calendar": {
    title: "Course calendars",
    blurb: "Course-by-course listings with prerequisites and grade designations. The strongest evidence available for sequencing.",
  },
  "university-credit-policy": {
    title: "University credit policies",
    blurb: "What Ontario universities actually grant for a qualification. Used to test claims that a program is a year ahead, and they disagree with each other.",
  },
  "school-outcome-report": {
    title: "Post-secondary outcomes",
    blurb: "School-published destinations, offers, or placement claims. Their original unit and missing denominators are preserved so unlike disclosures are never turned into a ranking.",
  },
  "assessment-policy": {
    title: "Assessment policy",
    blurb: "Rules governing standardized assessment participation and publication. These explain why private-school EQAO results are not used as a comparison layer.",
  },
  "community-thread": {
    title: "Community discussion",
    blurb: "Parent and student reports. Tracked separately and never used alone to move a placement.",
  },
  "secondary-directory": {
    title: "Secondary directories",
    blurb: "Aggregators such as Our Kids and Wikipedia. Labelled honestly rather than dressed up as primary sources.",
  },
};

export default function Sources() {
  const { evidence, programs, rules, outcomes } = levelingDataset;
  const citedBy = new Map<string, Set<string>>();
  for (const program of programs) {
    for (const sourceId of program.evidenceIds) {
      citedBy.set(sourceId, (citedBy.get(sourceId) ?? new Set()).add(program.id));
    }
  }
  for (const rule of rules) {
    for (const sourceId of rule.evidenceIds) {
      citedBy.set(sourceId, (citedBy.get(sourceId) ?? new Set()).add(rule.programId));
    }
  }
  for (const outcome of outcomes) {
    for (const sourceId of outcome.evidenceIds) {
      citedBy.set(sourceId, (citedBy.get(sourceId) ?? new Set()).add(outcome.programId));
    }
  }
  const nameOf = new Map(programs.map((program) => [program.id, program]));
  const stale = staleEvidence(evidence).length;

  const grouped = evidenceKinds
    .map((kind) => ({ kind, items: evidence.filter((item) => item.kind === kind) }))
    .filter(({ items }) => items.length > 0);

  return (
    <main>
      <div className="hero">
        <p className="eyebrow">Citations</p>
        <h1>{evidence.length} sources, read and quoted.</h1>
        <p>
          Every placement on this site points back to something published. This is the whole list, grouped by what
          kind of source it is, because the difference between a school&apos;s marketing page and a university&apos;s credit
          policy matters more than either one taken alone.
        </p>
        <p>
          {stale === 0
            ? "All of them were re-read within the last twelve months."
            : `${stale} of them have not been re-read in over twelve months and are flagged below.`}
        </p>
      </div>

      {grouped.map(({ kind, items }) => (
        <section className="source-group" key={kind}>
          <h2>{KIND_COPY[kind].title} <span>{items.length}</span></h2>
          <p className="source-blurb">{KIND_COPY[kind].blurb}</p>
          <ul className="source-list">
            {items.map((item: Evidence) => {
              const users = [...(citedBy.get(item.id) ?? new Set<string>())]
                .map((programId) => nameOf.get(programId))
                .filter((program): program is NonNullable<typeof program> => Boolean(program));
              return (
                <li key={item.id}>
                  <a href={item.canonicalUrl} target="_blank" rel="noreferrer">{item.title}</a>
                  <span className="source-meta">
                    {item.platform ?? item.publisher}
                    {" · read "}{formatAccessDate(item.accessDate)}
                    {item.corroboration && item.corroboration !== "not-applicable" ? ` · ${item.corroboration.replace(/-/g, " ")}` : ""}
                    {isStale(item.accessDate) && <em className="stale-flag">needs re-check</em>}
                  </span>
                  {item.quote && <blockquote>{item.quote}</blockquote>}
                  {users.length > 0 && (
                    <p className="source-users">
                      Cited by{" "}
                      {users.map((program, index) => (
                        <span key={program.id}>
                          {index > 0 && ", "}
                          <Link href={`/program/${program.id}`}>{program.abbreviation}</Link>
                        </span>
                      ))}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <p className="alignment-note">
        <strong>Found a broken link or a page that has changed?</strong>{" "}
        <Link href="/contribute">Tell us</Link> — schools rewrite their curriculum pages every admissions cycle, and a
        citation that no longer resolves is a placement we can no longer defend.
      </p>
    </main>
  );
}
