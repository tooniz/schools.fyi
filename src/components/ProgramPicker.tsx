"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Program } from "@/lib/schema";
import { MAX_PROGRAMS } from "@/lib/url-state";

export const KIND_LABELS: Record<Program["kind"], string> = {
  "public-curriculum": "Public curriculum",
  "independent-school": "Independent school",
  "international-framework": "International framework",
};

interface Props {
  programs: Program[];
  selected: string[];
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
}

export function ProgramPicker({ programs, selected, onAdd, onRemove }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const listId = useId();

  const byId = useMemo(() => new Map(programs.map((program) => [program.id, program])), [programs]);
  const matches = useMemo(() => {
    const available = programs.filter((program) => !selected.includes(program.id));
    const needle = query.trim().toLowerCase();
    if (!needle) return available;
    return available.filter((program) => `${program.name} ${program.displayName} ${program.abbreviation} ${program.location} ${KIND_LABELS[program.kind]}`.toLowerCase().includes(needle));
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

  return (
    <div className="program-picker" ref={root}>
      <ul className="track-list" aria-label="Programs being compared">
        {selected.map((id) => {
          const program = byId.get(id);
          if (!program) return null;
          return (
            <li key={id} data-kind={program.kind}>
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
                ? `Five is the most that fit. Adding another drops ${byId.get(selected[0])?.displayName ?? "the first"} from the left.`
                : `Room for ${MAX_PROGRAMS - selected.length} more.`}
            </p>
            {matches.length ? (
              <ul>
                {matches.map((program) => (
                  <li key={program.id}>
                    <button type="button" data-kind={program.kind} aria-label={`Add ${program.displayName}`} onClick={() => onAdd(program.id)}>
                      <span className="picker-name">{program.displayName}</span>
                      <span className="picker-meta">{KIND_LABELS[program.kind]} · {program.location}</span>
                      <span className="picker-state" aria-hidden="true">Add</span>
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
