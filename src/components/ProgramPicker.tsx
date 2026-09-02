"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { kindLabels, type Program } from "@/lib/schema";
import { MAX_PROGRAMS } from "@/lib/url-state";
import { AdmitsGlyph } from "./AdmitsGlyph";
import { FrameworkTag, frameworkLabel } from "./FrameworkTag";


interface Props {
  programs: Program[];
  selected: string[];
  pinned: string[];
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
}

const KIND_ORDER: Record<Program["kind"], number> = {
  "public-curriculum": 0,
  "international-framework": 1,
  "independent-school": 2,
  "enrichment-program": 3,
};

export function ProgramPicker({ programs, selected, pinned, onAdd, onRemove }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const listId = useId();

  const byId = useMemo(() => new Map(programs.map((program) => [program.id, program])), [programs]);
  const matches = useMemo(() => {
    const available = programs
      .filter((program) => !selected.includes(program.id))
      .sort((left, right) => KIND_ORDER[left.kind] - KIND_ORDER[right.kind]);
    const needle = query.trim().toLowerCase();
    if (!needle) return available;
    return available.filter((program) => {
      const framework = program.framework ? frameworkLabel(program.framework) : "";
      return `${program.name} ${program.displayName} ${program.abbreviation} ${program.location} ${kindLabels[program.kind]} ${framework}`.toLowerCase().includes(needle);
    });
  }, [programs, selected, query]);

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const node = root.current;
    const dismiss = (event: MouseEvent) => {
      if (!node?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setOpen(false);
    };
    document.addEventListener("mousedown", dismiss);
    node?.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", dismiss);
      node?.removeEventListener("keydown", escape);
    };
  }, [open]);

  const full = selected.length >= MAX_PROGRAMS;
  const evictionCandidate = full ? selected.find((id) => !pinned.includes(id)) : undefined;
  const locked = full && !evictionCandidate;

  return (
    <div className="program-picker" ref={root}>
      <ul className="track-list" aria-label="Programs being compared">
        {selected.map((id) => {
          const program = byId.get(id);
          if (!program) return null;
          return (
            <li key={id} data-kind={program.kind} data-framework={program.framework} data-scope={program.frameworkScope}>
              <span className="track-name">{program.abbreviation}</span>
              <button
                type="button"
                aria-label={`Remove ${program.displayName} from the comparison`}
                onClick={() => onRemove(id)}
                disabled={selected.length === 1}
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>

      <div className="picker-anchor">
        <button type="button" className="picker-toggle" aria-expanded={open} aria-controls={listId} onClick={() => { setOpen(!open); setQuery(""); }}>
          <span aria-hidden="true">+</span> Add program
        </button>

        {open && (
          <div className="picker-panel" id={listId}>
            <input
              ref={search}
              type="search"
              value={query}
              placeholder="Search schools and curricula"
              aria-label="Search programs"
              onChange={(event) => setQuery(event.target.value)}
            />
            <p className="picker-hint">
              {full
                ? locked
                  ? "All five tracks are pinned. Unpin one to add another."
                  : `Five is the most that fit. Adding another drops ${byId.get(evictionCandidate!)?.displayName ?? "the oldest unpinned track"} from the left.`
                : `Room for ${MAX_PROGRAMS - selected.length} more.`}
            </p>
            {matches.length ? (
              <ul>
                {matches.map((program) => (
                  <li key={program.id}>
                    <button type="button" data-kind={program.kind} data-framework={program.framework} data-scope={program.frameworkScope} aria-label={`Add ${program.displayName}`} disabled={locked} onClick={() => onAdd(program.id)}>
                      <span className="picker-name">{program.displayName}<AdmitsGlyph admits={program.admits} /></span>
                      <FrameworkTag framework={program.framework} scope={program.frameworkScope} />
                      <span className="picker-meta">{kindLabels[program.kind]} · {program.location}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="picker-empty">{query.trim() ? `No program matches “${query.trim()}”.` : "Every program is already in the comparison."}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
