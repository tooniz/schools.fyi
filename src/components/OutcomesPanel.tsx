import Link from "next/link";
import type { Evidence, OutcomeDisclosure, Program } from "@/lib/schema";

const eventLabels: Record<OutcomeDisclosure["eventType"], string> = {
  offer: "Offers",
  acceptance: "Acceptances",
  "intended-destination": "Intended destinations",
  matriculation: "Matriculation",
  placement: "Placement claim",
};

const flagLabels: Record<OutcomeDisclosure["qualityFlags"][number], string> = {
  "missing-denominator": "cohort size not published",
  "ambiguous-event-type": "placement method not defined",
  "mixed-cohorts": "not tied to one cohort",
  "selected-examples": "selected examples only",
  "arithmetic-mismatch": "published figures do not reconcile",
  "non-exhaustive-categories": "categories are incomplete",
  "duplicate-offers-possible": "offers may include several per student",
};

function observationValue({ value, unit }: OutcomeDisclosure["observations"][number]) {
  if (unit === "percent") return `${value}%`;
  if (unit === "distinct-institutions") return `${value} institutions`;
  if (unit === "offers") return `${value} offers`;
  return `${value} students`;
}

export function OutcomesPanel({
  programs,
  outcomes,
  evidence,
}: {
  programs: Program[];
  outcomes: OutcomeDisclosure[];
  evidence: Evidence[];
}) {
  const schools = programs.filter((program) => program.kind === "independent-school");
  const evidenceMap = new Map(evidence.map((item) => [item.id, item]));

  return (
    <section className="outcomes-panel" aria-labelledby="outcomes-title">
      <div className="outcomes-heading">
        <div>
          <p className="eyebrow">Non-ranked context</p>
          <h3 id="outcomes-title">Latest official post-secondary disclosures</h3>
        </div>
        <p>Offers, acceptances and destinations are different events. Each card keeps the school&apos;s original unit and says when a cohort denominator is missing.</p>
      </div>

      {schools.length ? (
        <div className="outcomes-grid">
          {schools.map((program) => {
            const outcome = outcomes.find((item) => item.programId === program.id);
            const sources = outcome?.evidenceIds.map((id) => evidenceMap.get(id)).filter((item): item is Evidence => Boolean(item)) ?? [];
            return (
              <article className="outcome-card" key={program.id} data-kind={program.kind}>
                <p className="outcome-school">{program.displayName}</p>
                {outcome ? (
                  <>
                    <div className="outcome-meta">
                      <span>{outcome.cohortLabel}</span>
                      <span>{eventLabels[outcome.eventType]}</span>
                    </div>
                    <p className="outcome-summary">{outcome.summary}</p>
                    {outcome.observations.length > 0 && (
                      <dl className="outcome-observations">
                        {outcome.observations.map((observation) => (
                          <div key={`${observation.label}-${observation.unit}`}>
                            <dt>{observation.label}</dt>
                            <dd>{observationValue(observation)}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    <p className="outcome-quality">
                      {outcome.denominator
                        ? `Cohort denominator: ${outcome.denominator} students.`
                        : "Cohort denominator not published."}
                      {outcome.qualityFlags.length > 0 && ` Caveats: ${outcome.qualityFlags.map((flag) => flagLabels[flag]).join("; ")}.`}
                    </p>
                    {sources.length > 0 && (
                      <p className="outcome-sources">
                        {sources.map((source, index) => (
                          <span key={source.id}>{index > 0 && " · "}<a href={source.canonicalUrl} target="_blank" rel="noreferrer">{index ? "Supporting source" : "Official source"}</a></span>
                        ))}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="outcome-missing">No cohort-compatible official disclosure is recorded. That means “not publicly reported,” not zero outcomes.</p>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="outcome-missing">Outcomes apply to schools, not curriculum or enrichment columns.</p>
      )}

      <p className="eqao-note">
        <strong>Why EQAO is absent:</strong> private schools may participate, but school-level files remain private and Ontario&apos;s public download explicitly excludes private schools. See the{" "}
        <a href="https://www.eqao.com/frequently-asked-questions/general/" target="_blank" rel="noreferrer">EQAO participation policy</a>
        {" and "}
        <a href="https://data.ontario.ca/dataset/school-information-and-student-demographics" target="_blank" rel="noreferrer">Ontario dataset</a>.
        {" "}<Link href="/sources">All outcome sources and access dates</Link>.
      </p>
    </section>
  );
}
