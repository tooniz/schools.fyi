"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { gradeLevels, levelingSubjects, subjectLabels } from "@/lib/schema";
import { ISSUES_URL, reportEndpoint } from "@/lib/report";

export interface ReportableProgram {
  id: string;
  displayName: string;
}

type Status = { state: "idle" | "pending" | "sent" } | { state: "error"; message: string };

function subscribeToHistory(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

/** Falls back to the repository's issue tracker so an unconfigured build still
 *  has somewhere real to send a report. */
function issueUrl(fields: Record<string, string>) {
  const subject = fields.subject ? subjectLabels[fields.subject as keyof typeof subjectLabels] : "";
  const where = [fields.program, fields.level, subject].filter(Boolean).join(" · ");
  const title = `[Leveling correction] ${where || "General"}`;
  const body = [
    `Program: ${fields.program || "(not specified)"}`,
    `Subject: ${subject || "(not specified)"}`,
    `Level: ${fields.level || "(not specified)"}`,
    `Comparison viewed: ${fields.comparison || "(not specified)"}`,
    "",
    `Source: ${fields.sourceUrl}`,
    "",
    "Proposed change:",
    fields.proposedChange,
    "",
    "Contributor notes:",
    fields.contributorNotes,
    "",
    "Conflict of interest:",
    fields.conflictOfInterest,
  ].join("\n");
  return `${ISSUES_URL}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}

export function ContributionForm({ programs }: { programs: ReportableProgram[] }) {
  // The server renders no query string, so prefill arrives after hydration.
  // Keying the fieldset on it re-applies the defaults once it does.
  const search = useSyncExternalStore(subscribeToHistory, () => location.search, () => "");
  const prefill = useMemo(() => new URLSearchParams(search), [search]);
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const endpoint = reportEndpoint();
  const hosted = Boolean(endpoint);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    // Anything that filled the hidden field is a bot; accept it silently rather
    // than telling it why it failed.
    if (data.get("_gotcha")) {
      setStatus({ state: "sent" });
      return;
    }
    const fields = Object.fromEntries([...data.entries()].map(([key, value]) => [key, String(value)]));
    if (!fields.sourceUrl || !fields.proposedChange || !fields.conflictOfInterest) {
      setStatus({ state: "error", message: "A source URL, a proposed change, and a conflict-of-interest statement are all required." });
      return;
    }

    if (!hosted) {
      location.href = issueUrl(fields);
      return;
    }

    setStatus({ state: "pending" });
    try {
      const response = await fetch(endpoint, { method: "POST", body: data, headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`The form service returned ${response.status}.`);
      setStatus({ state: "sent" });
      form.reset();
    } catch (error) {
      setStatus({
        state: "error",
        message: `${error instanceof Error ? error.message : "The report could not be sent."} You can open an issue directly instead.`,
      });
    }
  }

  if (status.state === "sent") {
    return (
      <div className="form-result" role="status">
        <p className="eyebrow">Received</p>
        <h2>Thank you — that is in the review queue.</h2>
        <p>Nothing is published automatically. A reviewer checks the citation, the conflict-of-interest note, and whether the source is primary before any placement moves.</p>
        <button type="button" onClick={() => setStatus({ state: "idle" })}>Report something else</button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      {!hosted && (
        <p className="form-notice" role="note">
          No hosted form is configured for this build, so submitting opens a prefilled issue on the project&apos;s
          issue tracker with everything you entered. Nothing is lost either way.
        </p>
      )}
      {status.state === "error" && <p className="error" role="alert">{status.message}</p>}

      <div key={search} className="form-fields">
        <div className="form-row">
          <label>
            Program
            <select name="program" defaultValue={prefill.get("program") ?? ""}>
              <option value="">Not listed / general</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>{program.displayName}</option>
              ))}
            </select>
          </label>
          <label>
            Subject
            <select name="subject" defaultValue={prefill.get("subject") ?? "mathematics"}>
              {levelingSubjects.map((value) => (
                <option key={value} value={value}>{subjectLabels[value]}</option>
              ))}
            </select>
          </label>
        </div>

        <label>
          Level
          <input name="level" list="grade-suggestions" defaultValue={prefill.get("level") ?? ""} placeholder="The level as that school names it, e.g. Grade 8 · Level I" />
        </label>
        <datalist id="grade-suggestions">
          {gradeLevels.map((grade) => <option key={grade} value={grade === "JK" || grade === "SK" ? grade : `Grade ${grade}`} />)}
        </datalist>

        <label>
          Source URL
          <input name="sourceUrl" type="url" required placeholder="https://" />
          <small>A page or PDF published by the school or curriculum authority. Directory listings and tutoring sites are not primary sources.</small>
        </label>

        <label>
          Proposed change
          <textarea name="proposedChange" minLength={20} required defaultValue={prefill.get("ask") ?? ""} />
        </label>

        <label>
          Contributor notes
          <textarea name="contributorNotes" minLength={10} required placeholder="How you know this, and which part of the source supports it." />
        </label>

        <label>
          Conflict of interest
          <textarea name="conflictOfInterest" required placeholder="State none, or explain your relationship to the school." />
        </label>

        <input type="hidden" name="comparison" value={prefill.get("comparison") ?? ""} />
        <input type="hidden" name="ask" value={prefill.get("ask") ?? ""} />
      </div>

      <p className="honeypot" aria-hidden="true">
        <label>Leave this field empty<input name="_gotcha" tabIndex={-1} autoComplete="off" /></label>
      </p>

      <button type="submit" disabled={status.state === "pending"}>
        {status.state === "pending" ? "Sending…" : hosted ? "Send report" : "Open a prefilled issue"}
      </button>
    </form>
  );
}
