import { Comparison } from "@/components/Comparison";
import { alignmentLevels, alignmentSources, comparisonEntities } from "@data/curriculums/alignment";

export default function Page() {
  return <main><div className="hero"><p className="eyebrow">Curriculum explorer</p><h1>See how learning paths line up</h1><p>Compare schools and curricula on a shared Ontario-relative scale, with the source and reasoning behind every placement.</p></div><Comparison entities={comparisonEntities} levels={alignmentLevels} sources={alignmentSources} /></main>;
}
