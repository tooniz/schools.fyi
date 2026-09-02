import type { Metadata } from "next";
import { ContributionForm } from "@/components/ContributionForm";
import { levelingDataset } from "@data/leveling";

export const metadata: Metadata = {
  title: "Report a correction — schools.fyi",
  description: "Submit a sourced correction to a curriculum leveling placement.",
};

export default function Contribute() {
  const programs = levelingDataset.programs
    .map(({ id, displayName }) => ({ id, displayName }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  return (
    <main className="narrow">
      <p className="eyebrow">Community review queue</p>
      <h1>Report a correction</h1>
      <p>
        Every placement on this site is an editorial reading of a published source, and some of them rest on
        thinner evidence than others. If one is wrong — or if you have the document that would settle it — this is
        where to say so.
      </p>
      <p>
        Submit only material supported by a public source. Nothing is published automatically: a reviewer checks
        the citation, whether the source is primary, the conflict-of-interest note, and how recently the source was
        published.
      </p>
      <ContributionForm programs={programs} />
    </main>
  );
}
