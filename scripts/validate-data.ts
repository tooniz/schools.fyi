import { expectations, schools, sources } from "../data/schools";
import { validateData } from "../src/lib/validation";
import { levelingDataset } from "../data/leveling";

const result = validateData({ schools, sources, expectations });
console.log(`Validated ${result.schools.length} schools, ${result.sources.length} sources, and ${result.expectations.length} expectations.`);
console.log(`Validated ${levelingDataset.programs.length} programs, ${levelingDataset.evidence.length} evidence records, and ${levelingDataset.rules.length} offset rules.`);
