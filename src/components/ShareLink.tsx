"use client";

import { useEffect, useState } from "react";

/** The comparison is already in the URL; nothing on the page said so. */
export function ShareLink() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2400);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(location.href);
      setCopied(true);
    } catch {
      // Clipboard access can be refused outright, and a link the reader can see
      // is more use than an error they cannot act on.
      prompt("Copy this comparison link:", location.href);
    }
  }

  return (
    <button type="button" className="share-link" onClick={copy} aria-live="polite">
      {copied ? "Link copied" : "Copy link to this comparison"}
    </button>
  );
}
