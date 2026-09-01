"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  CurriculumExpectation,
  GradeLevel,
  School,
  Source,
  Subject,
} from "@/lib/schema";
import { gradeLevels } from "@/lib/schema";
import {
  DEFAULT_SCHOOLS,
  parseState,
  serializeState,
} from "@/lib/url-state";

const gradeName = (grade: GradeLevel) => {
  if (grade === "JK") return "JK";
  if (grade === "SK") return "SK";
  return `Grade ${grade}`;
};

export function Comparison({
  schools,
  expectations,
  sources,
}: {
  schools: School[];
  expectations: CurriculumExpectation[];
  sources: Source[];
}) {
  const available = schools.filter((school) => school.reviewed);
  const initial =
    typeof window === "undefined"
      ? { subject: "math" as Subject, schools: DEFAULT_SCHOOLS, grade: "1" }
      : parseState(
          new URLSearchParams(location.search),
          available.map((school) => school.id),
        );
  const [subject, setSubject] = useState<Subject>(initial.subject);
  const [selected, setSelected] = useState(initial.schools);
  const [grade, setGrade] = useState(initial.grade as GradeLevel);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    history.replaceState(
      null,
      "",
      serializeState({ subject, schools: selected, grade }),
    );
  }, [subject, selected, grade]);

  const columns = available.filter((school) => selected.includes(school.id));
  const sourceMap = useMemo(
    () => new Map(sources.map((source) => [source.id, source])),
    [sources],
  );
  const expectationMap = useMemo(
    () =>
      new Map(
        expectations.map((expectation) => [
          `${expectation.schoolId}:${expectation.subject}:${expectation.grade}`,
          expectation,
        ]),
      ),
    [expectations],
  );

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.length > 1
          ? current.filter((value) => value !== id)
          : current
        : [...current, id],
    );
  }

  function selectGrade(nextGrade: GradeLevel) {
    setGrade(nextGrade);
    setOpen(null);
  }

  return (
    <section aria-labelledby="comparison-title">
      <div className="controls">
        <label>
          Subject
          <select
            aria-label="Subject"
            value={subject}
            onChange={(event) => {
              setSubject(event.target.value as Subject);
              setOpen(null);
            }}
          >
            <option value="math">Mathematics</option>
            <option value="language">Language</option>
          </select>
        </label>
        <fieldset>
          <legend>Schools and programs</legend>
          {available.map((school) => (
            <label key={school.id}>
              <input
                type="checkbox"
                checked={selected.includes(school.id)}
                onChange={() => toggle(school.id)}
              />
              {school.shortName}
            </label>
          ))}
        </fieldset>
      </div>

      <div className="leveling-heading">
        <div>
          <p className="eyebrow">Grade map</p>
          <h2 id="comparison-title">Compare grade levels</h2>
        </div>
        <p>
          Read from top to bottom. A bar positioned lower in the stack represents a
          higher grade.
        </p>
      </div>

      <div className="leveling-frame">
        <div className="leveling-scroll">
          <div
            className="leveling-grid"
            style={{ "--school-count": columns.length } as React.CSSProperties}
          >
            {columns.map((school) => (
              <div className="level-column" key={school.id}>
                <div className="level-column-head">
                  <span>{school.type.replaceAll("-", " ")}</span>
                  <strong>{school.shortName}</strong>
                </div>
                <div className="level-stack">
                  {gradeLevels.map((level) => {
                    const item = expectationMap.get(
                      `${school.id}:${subject}:${level}`,
                    );
                    if (!item) {
                      return (
                        <div
                          className="level-slot level-slot-empty"
                          key={level}
                          aria-hidden="true"
                        />
                      );
                    }
                    return (
                      <div className="level-slot" key={level}>
                        <button
                          className="level-bar"
                          data-active={grade === level}
                          aria-pressed={grade === level}
                          aria-label={`${school.shortName}, ${gradeName(level)}`}
                          onClick={() => selectGrade(level)}
                        >
                          <span>{gradeName(level)}</span>
                          <small>{item.comparisonLabel}</small>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="leveling-key" aria-hidden="true">
          <span>JK</span>
          <span className="leveling-key-line" />
          <span>Grade 12</span>
        </div>
      </div>

      <div className="selection-heading">
        <div>
          <p className="eyebrow">Selected level</p>
          <h2>
            {gradeName(grade)} · {subject === "math" ? "Mathematics" : "Language"}
          </h2>
        </div>
        <p className="hint">Select a bar for evidence and qualification details.</p>
      </div>

      <div className="comparison-grid" role="list">
        {columns.map((school) => {
          const item = expectationMap.get(`${school.id}:${subject}:${grade}`);
          const source = item ? sourceMap.get(item.sourceId) : undefined;
          const active = open === school.id;
          return (
            <article role="listitem" className="card" key={school.id}>
              <div className="card-head">
                <span className="school-type">
                  {school.type.replaceAll("-", " ")}
                </span>
                <h3>{school.shortName}</h3>
              </div>
              {item ? (
                <>
                  <p className="strand">{item.comparisonLabel}</p>
                  <p>{item.expectation}</p>
                  <button
                    className="details-button"
                    aria-expanded={active}
                    aria-controls={`detail-${school.id}`}
                    onClick={() => setOpen(active ? null : school.id)}
                  >
                    {active ? "Hide details" : "View details"}
                  </button>
                  {active && (
                    <div className="details" id={`detail-${school.id}`}>
                      <dl>
                        <dt>Published strand/domain</dt>
                        <dd>{item.strand}</dd>
                        <dt>Source wording</dt>
                        <dd>{item.sourceText}</dd>
                        <dt>Status</dt>
                        <dd>{item.verificationStatus.replaceAll("-", " ")}</dd>
                        <dt>Last reviewed</dt>
                        <dd>{item.lastReviewed}</dd>
                      </dl>
                      {item.qualificationNotes && (
                        <p>
                          <strong>Qualification:</strong> {item.qualificationNotes}
                        </p>
                      )}
                      {source && (
                        <p>
                          <strong>Source:</strong>{" "}
                          <a
                            href={source.canonicalUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {source.pageTitle} — {source.publisher}
                          </a>{" "}
                          <span className="source-kind">
                            {source.kind.replaceAll("-", " ")}
                          </span>
                        </p>
                      )}
                      <Link href="/contribute">Report a correction</Link>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="empty">Not publicly documented</p>
                  <p>
                    No reviewed {subject} expectation is available for this grade.
                  </p>
                </>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
