import { validateLeveling } from "../../src/lib/leveling";
import { applebyEvidence, applebyOffsets, applebyProgram } from "./appleby";
import { branksomeEvidence, branksomeOffsets, branksomeProgram } from "./branksome";
import { britishColumbiaEvidence, britishColumbiaOffsets, britishColumbiaProgram } from "./british-columbia";
import { commonCoreEvidence, commonCoreOffsets, commonCoreProgram } from "./common-core";
import { crescentEvidence, crescentOffsets, crescentProgram } from "./crescent";
import { englandEvidence, englandOffsets, englandProgram } from "./england";
import { ontarioEvidence } from "./evidence";
import { frameworkEvidence } from "./framework-evidence";
import { frameworkOffsets } from "./framework-offsets";
import { kumonEvidence, kumonOffsets, kumonProgram } from "./kumon";
import { lauremontEvidence, lauremontOffsets, lauremontProgram } from "./lauremont";
import { ontarioOffsets } from "./offsets";
import { outcomeEvidence, universityOutcomes } from "./outcomes";
import { frameworkPrograms, ontarioProgram, schoolPrograms } from "./programs";
import { singaporeMathEvidence, singaporeMathOffsets, singaporeMathProgram } from "./singapore-math";
import { schoolEvidence } from "./school-evidence";
import { schoolOffsets } from "./school-offsets";
import { spiritOfMathEvidence, spiritOfMathOffsets, spiritOfMathProgram } from "./spirit-of-math";
import { stMichaelsEvidence, stMichaelsOffsets, stMichaelsProgram } from "./st-michaels";
import { uccEvidence, uccOffsets, uccProgram } from "./ucc";
import { yorkEvidence, yorkOffsets, yorkProgram } from "./york";

/**
 * Schools added after the original Toronto four live in their own modules, each
 * holding its program, the sources it quotes, and the rules those sources support.
 */
const gtaSchoolPrograms = [branksomeProgram, uccProgram, crescentProgram, stMichaelsProgram, applebyProgram, lauremontProgram];
const gtaSchoolEvidence = [...branksomeEvidence, ...uccEvidence, ...crescentEvidence, ...stMichaelsEvidence, ...applebyEvidence, ...lauremontEvidence];
const gtaSchoolOffsets = [...branksomeOffsets, ...uccOffsets, ...crescentOffsets, ...stMichaelsOffsets, ...applebyOffsets, ...lauremontOffsets];

export const levelingDataset = validateLeveling({
  programs: [ontarioProgram, ...schoolPrograms, ...gtaSchoolPrograms, yorkProgram, ...frameworkPrograms, kumonProgram, spiritOfMathProgram, singaporeMathProgram, britishColumbiaProgram, englandProgram, commonCoreProgram],
  evidence: [...ontarioEvidence, ...schoolEvidence, ...gtaSchoolEvidence, ...yorkEvidence, ...frameworkEvidence, ...kumonEvidence, ...spiritOfMathEvidence, ...singaporeMathEvidence, ...britishColumbiaEvidence, ...englandEvidence, ...commonCoreEvidence, ...outcomeEvidence],
  rules: [...ontarioOffsets, ...schoolOffsets, ...gtaSchoolOffsets, ...yorkOffsets, ...frameworkOffsets, ...kumonOffsets, ...spiritOfMathOffsets, ...singaporeMathOffsets, ...britishColumbiaOffsets, ...englandOffsets, ...commonCoreOffsets],
  outcomes: universityOutcomes,
});
