import { expectations, schools, sources } from "../data/schools";
import { validateData } from "../src/lib/validation";
import { levelingDataset } from "../data/leveling";
import { STALE_AFTER_MONTHS, staleEvidence } from "../src/lib/freshness";

const result = validateData({ schools, sources, expectations });
console.log(`Validated ${result.schools.length} schools, ${result.sources.length} sources, and ${result.expectations.length} expectations.`);
console.log(`Validated ${levelingDataset.programs.length} programs, ${levelingDataset.evidence.length} evidence records, ${levelingDataset.rules.length} offset rules, and ${levelingDataset.outcomes.length} outcome disclosures.`);

// A stale citation is not a schema error — the claim may still be true — so this
// warns rather than failing the build, and CONTRIBUTING.md promises the re-check.
const stale = staleEvidence(levelingDataset.evidence);
if (stale.length) {
  console.warn(`\n${stale.length} source(s) not re-checked in over ${STALE_AFTER_MONTHS} months:`);
  for (const item of stale) console.warn(`  ${item.accessDate}  ${item.id}  ${item.canonicalUrl}`);
  console.warn("Re-read these and update accessDate, or correct the placement.");
}
