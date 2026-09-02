import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdmitsGlyph } from "@/components/AdmitsGlyph";
import { FrameworkTag } from "@/components/FrameworkTag";
import { OutcomesPanel } from "@/components/OutcomesPanel";

import { formatAccessDate, isStale } from "@/lib/freshness";
import { confidenceCopy, offsetLabel, ontarioGradeLabel } from "@/lib/leveling";
import { bandLabel } from "@/lib/questions";
import { isWeakPlacement, reportPath } from "@/lib/report";
import { depthLabels, isCommunityEvidence, kindLabels, levelingSubjects, paceLabels, pathwayKindLabels, subjectLabels, type Evidence, type Program } from "@/lib/schema";
import { levelingDataset } from "@data/leveling";

function findProgram(id: string): Program | undefined {
  return levelingDataset.programs.find((program) => program.id === id);
}

export function generateStaticParams() {
  return levelingDataset.programs.map(({ id }) => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const program = findProgram(id);
  if (!program) return { title: "Program not found — schools.fyi" };
  return {
    title: `${program.displayName} vs the Ontario curriculum — schools.fyi`,
    description: `How ${program.name} lines up against the Ontario curriculum by learning progress, with the sources behind every placement.`,
  };
}

/** The grades the program actually covers, in its own words. */
function gradeRange(program: Program): string {
  const covered = program.gradeLabels
    .map((label, index) => ({ label, index }))
    .filter(({ label }) => label !== null);
  if (!covered.length) return "No grades listed";
  const first = covered[0];
  const last = covered[covered.length - 1];
  const own = first.index === last.index ? first.label : `${first.label} – ${last.label}`;
  const ontario = first.index === last.index
    ? ontarioGradeLabel(first.index)
    : `${ontarioGradeLabel(first.index)} – ${ontarioGradeLabel(last.index)}`;
  return own === ontario ? String(own) : `${own} (Ontario ${ontario})`;
}

function SourceList({ items, title }: { items: Evidence[]; title: string }) {
  if (!items.length) return null;
  return (
    <>
      <h3>{title}</h3>
      <ul className="source-list">
        {items.map((item) => (
          <li key={item.id}>
            <a href={item.canonicalUrl} target="_blank" rel="noreferrer">{item.title}</a>
            <span className="source-meta">
              <span className="source-kind">{item.kind.replace(/-/g, " ")}</span>
              {item.platform ?? item.publisher}
              {" · read "}{formatAccessDate(item.accessDate)}
              {isStale(item.accessDate) && <em className="stale-flag">needs re-check</em>}
            </span>
            {item.quote && <blockquote>{item.quote}</blockquote>}
          </li>
        ))}
      </ul>
    </>
  );
}

export default async function ProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const program = findProgram(id);
  if (!program) notFound();

  const evidenceMap = new Map(levelingDataset.evidence.map((item) => [item.id, item]));
  const rules = levelingDataset.rules.filter((rule) => rule.programId === program.id);
  const cited = new Set([...program.evidenceIds, ...rules.flatMap((rule) => rule.evidenceIds)]);
  const sources = [...cited].map((sourceId) => evidenceMap.get(sourceId)).filter((item): item is Evidence => Boolean(item));

  return (
    <main className="program-page" data-kind={program.kind} data-framework={program.framework} data-scope={program.frameworkScope}>
      <p className="eyebrow">{kindLabels[program.kind]}<FrameworkTag framework={program.framework} scope={program.frameworkScope} /></p>
      <h1>{program.displayName}<AdmitsGlyph admits={program.admits} /></h1>
      <p className="program-sub">{program.descriptor} · {program.location}</p>

      <dl className="program-facts">
        <div><dt>Formal name</dt><dd>{program.name}</dd></div>
        <div><dt>Grades covered</dt><dd>{gradeRange(program)}</dd></div>
        <div><dt>Website</dt><dd><a href={program.url} target="_blank" rel="noreferrer">{new URL(program.url).hostname}</a></dd></div>
      </dl>

      <section>
        <h2>How this program is placed</h2>
        <p className="program-methodology">{program.methodology}</p>
        {program.pathways && program.pathways.length > 1 && (
          <dl className="program-pathways">
            {program.pathways.map((pathway) => (
              <div key={pathway.id}>
                <dt>{pathway.label} <span>{pathwayKindLabels[pathway.kind]}</span></dt>
                <dd>{pathway.description}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {program.kind === "independent-school" && (
        <OutcomesPanel programs={[program]} outcomes={levelingDataset.outcomes} evidence={levelingDataset.evidence} />
      )}

      <section>
        <h2>Placements by subject</h2>
        {levelingSubjects.map((subject) => {
          const subjectRules = rules.filter((rule) => rule.subject === subject);
          return (
            <div className="subject-block" key={subject}>
              <h3>{subjectLabels[subject]}</h3>
              {subjectRules.length === 0 ? (
                <p className="program-gap">
                  Not researched yet. This is a gap in our data, not a statement about the school.{" "}
                  <Link href={reportPath({ program: program.id, subject, ask: `Please add a ${subjectLabels[subject].toLowerCase()} placement for ${program.name}.` })}>Send us a source</Link>.
                </p>
              ) : (
                <ul className="placement-list">
                  {subjectRules.map((rule) => (
                    <li key={rule.id} data-confidence={rule.confidence} data-coverage={rule.coverage}>
                      <p className="placement-head">
                        <strong>{bandLabel(program, rule)}</strong>
                        <span className="offset-badge">{rule.coverage === "not-offered" ? "not taught" : offsetLabel(rule.offsetYears)}</span>
                        {rule.pathwayId && <span className="pathway-chip">{program.pathways?.find(({ id: pathwayId }) => pathwayId === rule.pathwayId)?.label ?? rule.pathwayId}</span>}
                        <em>{rule.confidence.replace(/-/g, " ")}</em>
                      </p>
                      <p className="placement-claim">{rule.claim}</p>
                      <p className="placement-rationale">{rule.rationale}</p>
                      {rule.coverage !== "not-offered" && <p className="placement-note"><strong>Depth:</strong> {depthLabels[rule.depth ?? "not-assessed"]} · <strong>Pace:</strong> {paceLabels[rule.pace ?? (rule.spanYears > 1 ? "faster" : "not-assessed")]}</p>}
                      {rule.spanYears !== 1 && <p className="placement-note">Covers {rule.spanYears} Ontario years of progress in one level.</p>}
                      {rule.acceleratedPathway && <p className="placement-note"><strong>Faster route available:</strong> {rule.acceleratedPathway}</p>}
                      {isWeakPlacement(rule.confidence) && <p className="placement-note">{confidenceCopy[rule.confidence]}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </section>

      <section>
        <h2>Sources</h2>
        <SourceList title="Official and school sources" items={sources.filter((item) => !isCommunityEvidence(item))} />
        <SourceList title="Community discussion" items={sources.filter(isCommunityEvidence)} />
      </section>

      <p className="alignment-note">
        <Link href={`/?programs=ontario,${program.id}`}>Compare {program.abbreviation} against Ontario</Link>
        {" · "}
        <Link href={reportPath({ program: program.id })}>Report a correction</Link>
        {" · "}
        <Link href="/questions">See what we are unsure about</Link>
      </p>
    </main>
  );
}
