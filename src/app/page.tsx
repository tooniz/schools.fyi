import Link from "next/link";
import { LevelingMatrix } from "@/components/LevelingMatrix";
import { countQuestions, openQuestions } from "@/lib/questions";
import { levelingDataset } from "@data/leveling";

export default function Page() {
  const open = countQuestions(openQuestions(levelingDataset));

  return (
    <main className="home-page">
      <div className="hero home-hero">
        <p className="eyebrow">School leveling</p>
        <h1>Compare what each grade level covers.</h1>
        <p className="home-summary">
          Toronto independent schools, public curricula, international frameworks, and enrichment programs — aligned
          across timing, depth, and pace.
          <span className="home-links">
            <Link href="/questions">{open} open placements</Link>
            {" · "}<Link href="/sources">{levelingDataset.evidence.length} cited sources</Link>
          </span>
        </p>
      </div>
      <LevelingMatrix dataset={levelingDataset} />
    </main>
  );
}
