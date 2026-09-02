"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AXIS_SIZE, buildLeveling, confidenceCopy, layoutMatrix, offsetLabel, ontarioEquivalent, ontarioGradeLabel, referenceTeaches } from "@/lib/leveling";
import type { LayoutCell, LevelingDataset } from "@/lib/leveling";
import { isCommunityEvidence, levelingSubjects, type Evidence, type LevelingSubject } from "@/lib/schema";
import { addProgram, parseState, serializeState, type LevelingState } from "@/lib/url-state";
import { KIND_LABELS, ProgramPicker } from "./ProgramPicker";

const SUBJECT_LABELS: Record<LevelingSubject, string> = { mathematics: "Mathematics", language: "English / Language", french: "French" };
const POPOVER_WIDTH = 340;
const GUTTER = 12;

function subscribeToHistory(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

/** A zero we can stand behind and a zero we simply cannot measure look identical
 *  in the number, so the column header names which one it is. */
function headline(headlineOffset: number, cells: LayoutCell[]) {
  if (headlineOffset > 0) return `up to ${offsetLabel(headlineOffset)} ahead`;
  const measured = cells.filter((cell) => !cell.notOffered && cell.confidence !== "insufficient-evidence");
  return measured.length ? "level with Ontario" : "no documented offset";
}

/** Blank stretches above and below a program's grade range, labelled so an empty
 *  column reads as "this school stops here" rather than as missing data. Keyed
 *  off the grades a program covers, not off leftover space: the rows past Grade
 *  12 exist as headroom for accelerated tracks and are nobody's missing years. */
function voids(cells: LayoutCell[], totalHeight: number, abbreviation: string) {
  if (!cells.length) return [];
  const first = cells[0];
  const last = cells[cells.length - 1];
  const bottom = last.top + last.height;
  return [
    { edge: "lead", show: first.gradeIndex > 0, top: 0, height: first.top, label: `${abbreviation} starts at ${first.label}` },
    { edge: "trail", show: last.gradeIndex < AXIS_SIZE - 1, top: bottom, height: totalHeight - bottom, label: `${abbreviation} ends after ${last.label}` },
  ].filter((gap) => gap.show && gap.height > 0.01);
}

function EvidenceList({ items, title }: { items: Evidence[]; title: string }) {
  if (!items.length) return null;
  return (
    <div className="evidence-block">
      <p className="evidence-title">{title}</p>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <a href={item.canonicalUrl} target="_blank" rel="noreferrer">{item.title}</a>
            <span className="evidence-meta">{item.platform ?? item.publisher}{item.corroboration && item.corroboration !== "not-applicable" ? ` · ${item.corroboration.replace("-", " ")}` : ""}</span>
            {item.quote && <blockquote>{item.quote}</blockquote>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LevelingMatrix({ dataset }: { dataset: LevelingDataset }) {
  const programIds = useMemo(() => dataset.programs.map(({ id }) => id), [dataset.programs]);
  // The server has no URL to read, so the search string arrives as an external
  // store: defaults render on the server, then the shared link takes over once
  // hydration finishes, rather than the two disagreeing mid-render.
  const search = useSyncExternalStore(subscribeToHistory, () => location.search, () => "");
  const fromUrl = useMemo(() => parseState(new URLSearchParams(search), programIds), [search, programIds]);
  const [override, setOverride] = useState<LevelingState | null>(null);
  const { subject, programs: selected } = override ?? fromUrl;
  const [open, setOpen] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<{ left: number; top: number } | null>(null);
  const activeCell = useRef<HTMLButtonElement | null>(null);
  const popover = useRef<HTMLDivElement | null>(null);
  const evidenceMap = useMemo(() => new Map(dataset.evidence.map((item) => [item.id, item])), [dataset.evidence]);

  const { columns, rows, totalHeight } = useMemo(
    () => layoutMatrix(buildLeveling(dataset, subject, selected)),
    [dataset, subject, selected],
  );

  const update = useCallback((next: LevelingState) => {
    setOverride(next);
    setOpen(null);
    history.replaceState(null, "", serializeState(next));
  }, []);

  const reposition = useCallback(() => {
    const button = activeCell.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const width = Math.min(POPOVER_WIDTH, window.innerWidth - GUTTER * 2);
    const left = Math.min(Math.max(rect.left, GUTTER), window.innerWidth - width - GUTTER);
    // Cells near the foot of a tall matrix have no room below them, so the panel
    // flips above the cell, and failing that is pinned inside the viewport and
    // left to scroll its own content.
    const height = popover.current?.offsetHeight ?? 0;
    const below = rect.bottom + 6;
    let top = below;
    if (height && below + height > window.innerHeight - GUTTER) {
      const above = rect.top - 6 - height;
      top = above >= GUTTER ? above : Math.max(GUTTER, window.innerHeight - GUTTER - height);
    }
    setAnchor({ left, top });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, reposition]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(null);
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, []);

  // Cells manage the popover themselves, so ignoring them here keeps clicking
  // straight from one level to the next working instead of only dismissing.
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest(".level-popover") || target.closest(".matrix-cell")) return;
      setOpen(null);
    };
    document.addEventListener("mousedown", dismiss);
    return () => document.removeEventListener("mousedown", dismiss);
  }, [open]);

  const activeEntry = open
    ? columns.flatMap((column) => column.cells.filter((item) => `${item.programId}-${item.gradeIndex}` === open).map((cell) => ({ cell, programName: column.program.displayName, kind: column.program.kind })))[0] ?? null
    : null;

  function detail(cell: LayoutCell, programName: string, kind: string) {
    const evidence = cell.rule.evidenceIds.map((id) => evidenceMap.get(id)).filter((item): item is Evidence => Boolean(item));
    const unmatched = !cell.notOffered && !referenceTeaches(dataset, subject, cell.progressStart);
    return (
      <div
        className="level-popover"
        ref={popover}
        id={`cell-${cell.programId}-${cell.gradeIndex}`}
        role="dialog"
        data-kind={kind}
        aria-label={`${programName}: ${cell.label}`}
        style={anchor ? { left: anchor.left, top: anchor.top } : undefined}
      >
        <button className="popover-close" aria-label="Close details" onClick={() => setOpen(null)}>×</button>
        <p className="eyebrow">{cell.notOffered ? "not taught" : unmatched ? "no Ontario counterpart" : offsetLabel(cell.offsetYears)} · {cell.confidence.replace("-", " ")}</p>
        <h3>{programName} {cell.label}</h3>
        <p className="popover-lede">{cell.notOffered
          ? <>This subject is <strong>not taught</strong> at this stage, so there is no level to compare.</>
          : unmatched
            ? <>Ontario teaches no {SUBJECT_LABELS[subject].toLowerCase()} this early, so this level sits against an <strong>empty provincial column</strong> rather than ahead of one.</>
            : <>Sits at Ontario <strong>{ontarioEquivalent(cell)}</strong> on the difficulty and progress scale{cell.spanYears !== 1 ? `, covering ${cell.spanYears} Ontario years in one` : ""}.</>}</p>
        <dl>
          <dt>Claim</dt><dd>{cell.rule.claim}</dd>
          <dt>Why it sits here</dt><dd>{cell.rule.rationale}</dd>
          <dt>Confidence</dt><dd>{confidenceCopy[cell.confidence]}</dd>
          {cell.rule.acceleratedPathway && <><dt>Faster route available</dt><dd>{cell.rule.acceleratedPathway}</dd></>}
          {cell.stretched && <><dt>Box height</dt><dd>Drawn back to the level below it so the ladder stays continuous. The claim above is the position this level actually occupies.</dd></>}
        </dl>
        <EvidenceList title="Official and school sources" items={evidence.filter((item) => !isCommunityEvidence(item))} />
        <EvidenceList title="Community discussion" items={evidence.filter(isCommunityEvidence)} />
        <Link href="/contribute">Report a correction</Link>
      </div>
    );
  }

  return (
    <section aria-labelledby="leveling-title">
      <div className="leveling-toolbar">
        <div className="subject-tabs" role="tablist" aria-label="Subject">
          {levelingSubjects.map((value) => (
            <button key={value} role="tab" aria-selected={subject === value} onClick={() => update({ subject: value, programs: selected })}>{SUBJECT_LABELS[value]}</button>
          ))}
        </div>
        <ProgramPicker
          programs={dataset.programs}
          selected={selected}
          onAdd={(id) => update({ subject, programs: addProgram(selected, id) })}
          onRemove={(id) => selected.length > 1 && update({ subject, programs: selected.filter((value) => value !== id) })}
        />
      </div>

      <div className="leveling-heading">
        <div>
          <p className="eyebrow">Difficulty-aligned leveling</p>
          <h2 id="leveling-title">{SUBJECT_LABELS[subject]} leveling</h2>
        </div>
        <p>Rows are Ontario progress steps, not grade names. A level is placed by how far through the learning sequence it sits, so an accelerated Grade 5 can line up against Ontario Grade 6.</p>
      </div>

      <div className="matrix-shell">
        <aside className="matrix-axis">
          <div className="axis-head">Ontario progress</div>
          <div className="axis-track" style={{ "--total": totalHeight } as React.CSSProperties}>
            {rows.map((row) => (
              <div className="axis-row" key={row.index} data-beyond={row.beyond} style={{ "--top": row.top, "--height": row.height } as React.CSSProperties}>
                <strong>{row.beyond ? "" : `L${row.index + 1}`}</strong>
                <span>{row.beyond ? (row.index === AXIS_SIZE ? "Past Gr 12" : "") : ontarioGradeLabel(row.index)}</span>
              </div>
            ))}
          </div>
        </aside>
        <div className="matrix-scroll">
          <div className="matrix-grid" style={{ "--column-count": columns.length } as React.CSSProperties}>
            {columns.map(({ program, cells, headlineOffset }) => (
              <article className="matrix-column" key={program.id} aria-label={program.displayName} data-kind={program.kind}>
                <header>
                  <span>{KIND_LABELS[program.kind]}</span>
                  <strong>{program.displayName}</strong>
                  <small>{program.descriptor}</small>
                  <em data-ahead={headlineOffset > 0}>{headline(headlineOffset, cells)}</em>
                </header>
                <div className="matrix-track" style={{ "--total": totalHeight } as React.CSSProperties}>
                  {rows.map((row) => (
                    <div className="track-row" key={row.index} data-beyond={row.beyond} style={{ "--top": row.top, "--height": row.height } as React.CSSProperties} />
                  ))}
                  {voids(cells, totalHeight, program.abbreviation).map((gap) => (
                    <p className="track-void" key={gap.edge} style={{ "--top": gap.top, "--height": gap.height } as React.CSSProperties}>{gap.label}</p>
                  ))}
                  {cells.map((cell) => {
                    const cellId = `${cell.programId}-${cell.gradeIndex}`;
                    const active = open === cellId;
                    return (
                      <button
                        key={cellId}
                        ref={active ? activeCell : undefined}
                        className="matrix-cell"
                        style={{ "--top": cell.top, "--height": cell.height } as React.CSSProperties}
                        data-offset={cell.notOffered ? "absent" : cell.offsetYears > 0 ? "ahead" : cell.offsetYears < 0 ? "behind" : "level"}
                        data-confidence={cell.confidence}
                        aria-expanded={active}
                        aria-controls={`cell-${cellId}`}
                        onClick={() => setOpen(active ? null : cellId)}
                      >
                        <strong>{cell.label}</strong>
                        {cell.notOffered ? <span className="offset-badge">not taught</span> : cell.offsetYears !== 0 ? <span className="offset-badge">{offsetLabel(cell.offsetYears)}</span> : cell.spanYears !== 1 && <span className="offset-badge">{cell.spanYears}× pace</span>}
                      </button>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      {activeEntry && <div className="popover-layer">{detail(activeEntry.cell, activeEntry.programName, activeEntry.kind)}</div>}

      <div className="matrix-legend">
        {(Object.keys(KIND_LABELS) as (keyof typeof KIND_LABELS)[]).map((kind) => (
          <span className="kind-key" data-kind={kind} key={kind}>{KIND_LABELS[kind]}</span>
        ))}
      </div>

      <div className="matrix-legend">
        <span data-offset="level">Same pace as Ontario</span>
        <span data-offset="ahead">Ahead of Ontario</span>
        <span data-offset="behind">Behind Ontario</span>
        <span data-offset="absent">Subject not taught yet</span>
        <span data-confidence="community-reported">Community-reported only</span>
      </div>

      <p className="alignment-note"><strong>Methodology:</strong> Each level is placed on the Ontario progress axis using published curriculum structure, course sequencing, and typical student age, adjusted by any documented or community-reported pace difference. Where one program fits two levels into the same stretch of the axis, that stretch is drawn taller and every column across it grows to match. Select a cell for its claim, rationale, confidence, and sources. These are editorial comparisons — not accreditation, transfer-credit rulings, or placement advice.</p>
    </section>
  );
}
