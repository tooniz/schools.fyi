import { validateLeveling } from "../../src/lib/leveling";
import { ontarioEvidence } from "./evidence";
import { frameworkEvidence } from "./framework-evidence";
import { frameworkOffsets } from "./framework-offsets";
import { ontarioOffsets } from "./offsets";
import { frameworkPrograms, ontarioProgram, schoolPrograms } from "./programs";
import { schoolEvidence } from "./school-evidence";
import { schoolOffsets } from "./school-offsets";

export const levelingDataset = validateLeveling({
  programs: [ontarioProgram, ...schoolPrograms, ...frameworkPrograms],
  evidence: [...ontarioEvidence, ...schoolEvidence, ...frameworkEvidence],
  rules: [...ontarioOffsets, ...schoolOffsets, ...frameworkOffsets],
});
