"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AlignmentLevel, ComparisonEntity, Source } from "@/lib/schema";
import { DEFAULT_SCHOOLS, parseState, serializeState } from "@/lib/url-state";

const AXIS_LABELS = ["JK", "SK", ...Array.from({ length: 12 }, (_, index) => `${index + 1}`)];

export function Comparison({ entities, levels, sources }: { entities: ComparisonEntity[]; levels: AlignmentLevel[]; sources: Source[] }) {
  const initial = typeof window === "undefined" ? { subject: "math" as const, schools: DEFAULT_SCHOOLS } : parseState(new URLSearchParams(location.search), entities.map(({ id }) => id));
  const [selected, setSelected] = useState(initial.schools);
  const [open, setOpen] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const sourceMap = useMemo(() => new Map(sources.map((source) => [source.id, source])), [sources]);
  const columns = entities.filter(({ id }) => selected.includes(id));

  useEffect(() => history.replaceState(null, "", serializeState({ subject: "math", schools: selected })), [selected]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(null);
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, []);

  function toggle(id: string) {
    setOpen(null);
    setSelected((current) => current.includes(id) ? (current.length > 1 ? current.filter((value) => value !== id) : current) : [...current, id]);
  }

  return (
    <section ref={sectionRef} aria-labelledby="comparison-title">
      <div className="controls entity-controls">
        {(["school", "curriculum"] as const).map((category) => (
          <fieldset key={category}>
            <legend>{category === "school" ? "Schools" : "Curriculums"}</legend>
            {entities.filter((entity) => entity.category === category).map((entity) => (
              <label key={entity.id}><input type="checkbox" checked={selected.includes(entity.id)} onChange={() => toggle(entity.id)} />{entity.shortName}</label>
            ))}
          </fieldset>
        ))}
      </div>

      <div className="leveling-heading">
        <div><p className="eyebrow">Ontario-relative map</p><h2 id="comparison-title">Compare learning structures</h2></div>
        <p>Vertical position is normalized to Ontario grades. Box height shows the span of a level or programme—not workload or difficulty.</p>
      </div>

      <div className="alignment-shell">
        <aside className="alignment-axis" aria-hidden="true"><div className="axis-head">Ontario</div>{AXIS_LABELS.map((label) => <span key={label}>{label}</span>)}</aside>
        <div className="alignment-scroll">
          <div className="alignment-grid" style={{ "--column-count": columns.length } as React.CSSProperties}>
            {columns.map((entity) => (
              <article className="alignment-column" key={entity.id}>
                <header><span>{entity.category}</span><strong>{entity.shortName}</strong><small>{entity.descriptor}</small></header>
                <div className="alignment-track">
                  {levels.filter(({ entityId }) => entityId === entity.id).map((level) => {
                    const source = sourceMap.get(level.sourceId);
                    const active = open === level.id;
                    const split = level.id === "ib-dp" || level.id === "ib-cp";
                    return <div className={`alignment-item-wrap${split ? ` ${level.id}` : ""}`} key={level.id} style={{ "--start": level.ontarioStart, "--span": level.ontarioEnd - level.ontarioStart } as React.CSSProperties}>
                      <button className="alignment-item" aria-expanded={active} aria-controls={`level-${level.id}`} onClick={() => setOpen(active ? null : level.id)}>
                        <strong>{level.label}</strong><span>{level.confidence}</span>
                      </button>
                      {active && <div className="level-popover" id={`level-${level.id}`} role="dialog" aria-label={`${entity.shortName}: ${level.label}`}>
                        <button className="popover-close" aria-label="Close details" onClick={() => setOpen(null)}>×</button>
                        <p className="eyebrow">{entity.category} · {level.confidence} alignment</p>
                        <h3>{level.label}</h3><p>{level.detail}</p>
                        <dl><dt>Why it sits here</dt><dd>{level.rationale}</dd><dt>Method</dt><dd>{entity.methodology}</dd></dl>
                        {source && <p className="popover-source"><a href={source.canonicalUrl} target="_blank" rel="noreferrer">{source.pageTitle} — {source.publisher}</a></p>}
                        <Link href="/contribute">Report a correction</Link>
                      </div>}
                    </div>;
                  })}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
      <p className="alignment-note"><strong>Methodology:</strong> Approximate alignments use typical student age, programme duration, and published structure. They are editorial comparisons—not transfer-credit or curriculum-equivalency decisions. Select any box for its specific rationale and source.</p>
    </section>
  );
}
