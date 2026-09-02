"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AXIS_SIZE, buildLeveling, confidenceCopy, defaultPathway, layoutMatrix, offsetLabel, ontarioEquivalent, ontarioGradeLabel, pathwaysFor, referenceTeaches } from "@/lib/leveling";
import type { LayoutCell, LevelingDataset } from "@/lib/leveling";
import { depthLabels, isCommunityEvidence, kindLabels, levelingSubjects, paceLabels, pathwayKindLabels, subjectLabels, type Evidence, type Program } from "@/lib/schema";
import { STALE_AFTER_MONTHS, formatAccessDate, isStale } from "@/lib/freshness";
import { isWeakPlacement, reportPath, settlingAsk } from "@/lib/report";
import { addProgram, parseState, serializeState, type LevelingState } from "@/lib/url-state";
import { AdmitsGlyph } from "./AdmitsGlyph";
import { FrameworkTag } from "./FrameworkTag";
import { OutcomesPanel } from "./OutcomesPanel";
import { ProgramPicker } from "./ProgramPicker";
import { ShareLink } from "./ShareLink";

const POPOVER_WIDTH = 340;
const GUTTER = 12;

/** The reader's own view, so a reviewer can reopen exactly what they saw. */
function comparisonLink(state: LevelingState) {
  const query = serializeState(state);
  return typeof location === "undefined" ? query : `${location.origin}${location.pathname}${query}`;
}

function subscribeToHistory(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

/** A zero we can stand behind and a zero we simply cannot measure look identical
 *  in the number, so the column header names which one it is. */
function headline(headlineOffset: number, cells: LayoutCell[]) {
  if (headlineOffset > 0) return `up to ${offsetLabel(headlineOffset)} ahead`;
  const measured = cells.filter((cell) => !cell.notOffered && cell.confidence !== "insufficient-evidence");
  return measured.length ? "content level with Ontario" : "no documented timing offset";
}

function cellBadge(cell: LayoutCell): string | null {
  if (cell.notOffered) return "not taught";
  const parts: string[] = [];
  if (cell.offsetYears !== 0) parts.push(offsetLabel(cell.offsetYears));
  else if (cell.spanYears !== 1) parts.push(`${cell.spanYears}× pace`);
  if (cell.depth === "enriched" || cell.depth === "advanced") parts.push(cell.depth);
  else if (!parts.length && cell.pace === "faster") parts.push("faster pace");
  return parts.length ? parts.join(" · ") : null;
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
            <span className="evidence-meta">
              {item.platform ?? item.publisher}
              {item.corroboration && item.corroboration !== "not-applicable" ? ` · ${item.corroboration.replace("-", " ")}` : ""}
              {" · read "}{formatAccessDate(item.accessDate)}
              {isStale(item.accessDate) && <em className="stale-flag" title={`Not re-checked in over ${STALE_AFTER_MONTHS} months`}>needs re-check</em>}
            </span>
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
  const { subject, programs: selected, pathways = {}, pinned = [], outcomes = false } = override ?? fromUrl;
  const [open, setOpen] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<{ left: number; top: number } | null>(null);
  const activeCell = useRef<HTMLButtonElement | null>(null);
  const popover = useRef<HTMLDivElement | null>(null);
  const evidenceMap = useMemo(() => new Map(dataset.evidence.map((item) => [item.id, item])), [dataset.evidence]);

  const { columns, rows, totalHeight } = useMemo(
    () => layoutMatrix(buildLeveling(dataset, subject, selected, pathways)),
    [dataset, subject, selected, pathways],
  );

  const currentState: LevelingState = {
    subject,
    programs: selected,
    ...(Object.keys(pathways).length ? { pathways } : {}),
    ...(pinned.length ? { pinned } : {}),
    ...(outcomes ? { outcomes: true } : {}),
  };

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
    ? columns.flatMap((column) => column.cells.filter((item) => `${item.programId}-${item.gradeIndex}` === open).map((cell) => ({ cell, program: column.program })))[0] ?? null
    : null;

  function detail(cell: LayoutCell, program: Program) {
    const programName = program.displayName;
    const evidence = cell.rule.evidenceIds.map((id) => evidenceMap.get(id)).filter((item): item is Evidence => Boolean(item));
    const unmatched = !cell.notOffered && !referenceTeaches(dataset, subject, cell.progressStart);
    const weak = isWeakPlacement(cell.confidence);
    return (
      <div
        className="level-popover"
        ref={popover}
        id={`cell-${cell.programId}-${cell.gradeIndex}`}
        role="dialog"
        data-kind={program.kind}
        data-framework={program.framework} data-scope={program.frameworkScope}
        aria-label={`${programName}: ${cell.label}`}
        style={anchor ? { left: anchor.left, top: anchor.top } : undefined}
      >
        <button className="popover-close" aria-label="Close details" onClick={() => setOpen(null)}>×</button>
        <p className="eyebrow">{cell.notOffered ? "not taught" : unmatched ? "no Ontario counterpart" : `content timing ${offsetLabel(cell.offsetYears)}`} · {cell.confidence.replace("-", " ")}</p>
        <h3>{programName} {cell.label}</h3>
        <p className="popover-lede">{cell.notOffered
          ? <>This subject is <strong>not taught</strong> at this stage, so there is no level to compare.</>
          : unmatched
            ? <>Ontario teaches no {subjectLabels[subject].toLowerCase()} this early, so this level sits against an <strong>empty provincial column</strong> rather than ahead of one.</>
            : <>Sits at Ontario <strong>{ontarioEquivalent(cell)}</strong> on the content sequence{cell.spanYears !== 1 ? `, covering ${cell.spanYears} Ontario years in one level` : ""}. Depth and pace are scored separately below.</>}</p>
        <dl>
          {!cell.notOffered && <><dt>Content timing</dt><dd>{offsetLabel(cell.offsetYears)} · aligned to {ontarioEquivalent(cell)}</dd></>}
          {!cell.notOffered && <><dt>Depth</dt><dd>{depthLabels[cell.depth]}</dd></>}
          {!cell.notOffered && <><dt>Pace</dt><dd>{paceLabels[cell.pace]}</dd></>}
          {cell.pathwayId && <><dt>Pathway</dt><dd>{program.pathways?.find(({ id }) => id === cell.pathwayId)?.label ?? cell.pathwayId}</dd></>}
          <dt>Claim</dt><dd>{cell.rule.claim}</dd>
          <dt>Why it sits here</dt><dd>{cell.rule.rationale}</dd>
          <dt>Confidence</dt><dd>{confidenceCopy[cell.confidence]}</dd>
          {cell.rule.acceleratedPathway && <><dt>Faster route available</dt><dd>{cell.rule.acceleratedPathway}</dd></>}
          {cell.stretched && <><dt>Box height</dt><dd>Drawn back to the level below it so the ladder stays continuous. The claim above is the position this level actually occupies.</dd></>}
        </dl>
        <EvidenceList title="Official and school sources" items={evidence.filter((item) => !isCommunityEvidence(item))} />
        <EvidenceList title="Community discussion" items={evidence.filter(isCommunityEvidence)} />
        {weak && (
          <p className="popover-ask">
            <strong>Help us settle this.</strong> {settlingAsk(cell.confidence, programName, subjectLabels[subject], cell.label)}
          </p>
        )}
        <Link href={reportPath({
          program: cell.programId,
          subject,
          level: cell.label,
          comparison: comparisonLink(currentState),
          ask: weak ? settlingAsk(cell.confidence, programName, subjectLabels[subject], cell.label) : undefined,
        })}>{weak ? "Send us the source" : "Report a correction"}</Link>
      </div>
    );
  }

  return (
    <section aria-labelledby="leveling-title">
      <div className="leveling-toolbar">
        <div className="subject-tabs" role="tablist" aria-label="Subject">
          {levelingSubjects.map((value) => (
            <button key={value} role="tab" aria-selected={subject === value} onClick={() => update({ ...currentState, subject: value })}>{subjectLabels[value]}</button>
          ))}
        </div>
        <ProgramPicker
          programs={dataset.programs}
          selected={selected}
          pinned={pinned}
          onAdd={(id) => {
            const nextPrograms = addProgram(selected, id, pinned);
            if (nextPrograms === selected) return;
            const retained = new Set(nextPrograms);
            const nextPathways = Object.fromEntries(Object.entries(pathways).filter(([programId]) => retained.has(programId)));
            const nextPinned = pinned.filter((programId) => retained.has(programId));
            update({
              ...currentState,
              programs: nextPrograms,
              ...(Object.keys(nextPathways).length ? { pathways: nextPathways } : { pathways: undefined }),
              ...(nextPinned.length ? { pinned: nextPinned } : { pinned: undefined }),
            });
          }}
          onRemove={(id) => {
            if (selected.length <= 1) return;
            const nextPathways = { ...pathways };
            const nextPinned = pinned.filter((programId) => programId !== id);
            delete nextPathways[id];
            update({
              ...currentState,
              programs: selected.filter((value) => value !== id),
              ...(Object.keys(nextPathways).length ? { pathways: nextPathways } : { pathways: undefined }),
              ...(nextPinned.length ? { pinned: nextPinned } : { pinned: undefined }),
            });
          }}
        />
      </div>

      <div className="leveling-heading">
        <div>
          <p className="eyebrow">Difficulty-aligned leveling</p>
          <h2 id="leveling-title">{subjectLabels[subject]} leveling</h2>
        </div>
        <div className="heading-aside">
          <p>Rows align content timing to Ontario; depth and pace stay separate.</p>
          <div className="heading-actions">
            <button className="outcomes-toggle" type="button" aria-pressed={outcomes} onClick={() => update({ ...currentState, outcomes: !outcomes })}>
              {outcomes ? "Hide outcomes" : "Show outcomes"}
            </button>
            <ShareLink />
          </div>
        </div>
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
            {columns.map(({ program, cells, headlineOffset, unresearched, pathway }) => {
              const choices = pathwaysFor(program, subject);
              const fallback = defaultPathway(program, subject);
              const subjectNote = program.subjectNotes?.[subject];
              const isPinned = pinned.includes(program.id);
              return (
              <article className="matrix-column" key={program.id} aria-label={program.displayName} data-kind={program.kind} data-framework={program.framework} data-scope={program.frameworkScope}>
                <header>
                  <button
                    className="pin-toggle"
                    type="button"
                    aria-label={`${isPinned ? "Unpin" : "Pin"} ${program.displayName}`}
                    aria-pressed={isPinned}
                    title={isPinned ? `Unpin ${program.displayName}` : `Pin ${program.displayName} so additions keep it`}
                    onClick={() => {
                      const nextPinned = isPinned
                        ? pinned.filter((programId) => programId !== program.id)
                        : [...pinned, program.id];
                      update({ ...currentState, ...(nextPinned.length ? { pinned: nextPinned } : { pinned: undefined }) });
                    }}
                  >
                    <span aria-hidden="true">📌</span>
                  </button>
                  <span>{kindLabels[program.kind]}<FrameworkTag framework={program.framework} scope={program.frameworkScope} /></span>
                  <strong><Link href={`/program/${program.id}`}>{program.displayName}</Link><AdmitsGlyph admits={program.admits} /></strong>
                  <small>{program.descriptor}</small>
                  {choices.length > 1 && (
                    <label className="pathway-select">
                      <span>Pathway</span>
                      <select
                        aria-label={`${program.displayName} pathway`}
                        value={pathway?.id ?? fallback?.id ?? ""}
                        onChange={(event) => {
                          const nextPathways = { ...pathways };
                          if (event.target.value === fallback?.id) delete nextPathways[program.id];
                          else nextPathways[program.id] = event.target.value;
                          update({ ...currentState, ...(Object.keys(nextPathways).length ? { pathways: nextPathways } : { pathways: undefined }) });
                        }}
                      >
                        {choices.map((choice) => <option key={choice.id} value={choice.id}>{choice.label} · {pathwayKindLabels[choice.kind]}</option>)}
                      </select>
                    </label>
                  )}
                  <em data-ahead={headlineOffset > 0}>{unresearched ? (subjectNote ? "outside this curriculum" : "not researched yet") : headline(headlineOffset, cells)}</em>
                </header>
                <div className="matrix-track" style={{ "--total": totalHeight } as React.CSSProperties}>
                  {rows.map((row) => (
                    <div className="track-row" key={row.index} data-beyond={row.beyond} style={{ "--top": row.top, "--height": row.height } as React.CSSProperties} />
                  ))}
                  {unresearched && (
                    <p className="track-unresearched">
                      {subjectNote ? (
                        subjectNote
                      ) : (
                        <>
                          No {subjectLabels[subject].toLowerCase()} placement for {program.abbreviation} yet.
                          This is a gap in our research, not in the school.
                          <Link href={reportPath({ program: program.id, subject, ask: `Please add a ${subjectLabels[subject].toLowerCase()} placement for ${program.name}. A curriculum page, course calendar, or scope-and-sequence document would be enough to start.` })}>Send us a source</Link>
                        </>
                      )}
                    </p>
                  )}
                  {voids(cells, totalHeight, program.abbreviation).map((gap) => (
                    <p className="track-void" key={gap.edge} style={{ "--top": gap.top, "--height": gap.height } as React.CSSProperties}>{gap.label}</p>
                  ))}
                  {cells.map((cell) => {
                    const cellId = `${cell.programId}-${cell.gradeIndex}`;
                    const active = open === cellId;
                    const badge = cellBadge(cell);
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
                        {badge && <span className="offset-badge">{badge}</span>}
                      </button>
                    );
                  })}
                </div>
              </article>
              );
            })}
          </div>
        </div>
      </div>

      {activeEntry && <div className="popover-layer">{detail(activeEntry.cell, activeEntry.program)}</div>}

      {outcomes && <OutcomesPanel programs={columns.map(({ program }) => program)} outcomes={dataset.outcomes} evidence={dataset.evidence} />}

      <div className="matrix-legend">
        <span data-offset="ahead">Ahead of Ontario</span>
        <span data-offset="behind">Behind Ontario</span>
        <span data-offset="absent">Subject not taught yet</span>
      </div>

      <p className="matrix-methodology"><strong>Methodology:</strong> Rows align content timing to Ontario; depth and pace are assessed separately. These are sourced editorial comparisons, not rankings or placement advice.</p>
    </section>
  );
}
