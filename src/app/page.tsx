import { LevelingMatrix } from "@/components/LevelingMatrix";
import { levelingDataset } from "@data/leveling";

export default function Page() {
  return (
    <main>
      <div className="hero">
        <p className="eyebrow">Curriculum leveling</p>
        <h1>Grade labels lie. Compare the actual level.</h1>
        <p>Toronto independent schools and the Ontario curriculum, lined up by how far through the learning sequence each level sits — so you can see where an accelerated Grade 5 really lands. Every placement shows its claim, confidence, and sources.</p>
      </div>
      <LevelingMatrix dataset={levelingDataset} />
    </main>
  );
}
