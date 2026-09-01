import { expectations, schools, sources } from "@data/schools";
import type { CurriculumExpectation, School, Source, Subject } from "./schema";
export interface CurriculumRepository {listSchools(subject?:Subject):School[];getExpectations(schoolIds:string[],subject:Subject):CurriculumExpectation[];getSource(id:string):Source|undefined;}
export class FileCurriculumRepository implements CurriculumRepository {listSchools(subject?:Subject){if(!subject)return schools;const ids=new Set(expectations.filter(e=>e.subject===subject&&e.verificationStatus!=="pending-review").map(e=>e.schoolId));return schools.filter(s=>s.reviewed&&ids.has(s.id));}getExpectations(ids:string[],subject:Subject){return expectations.filter(e=>ids.includes(e.schoolId)&&e.subject===subject).sort((a,b)=>a.sequence-b.sequence);}getSource(id:string){return sources.find(s=>s.id===id);}}
export const repository=new FileCurriculumRepository();
