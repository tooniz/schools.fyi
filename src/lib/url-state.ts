import { subjects, type Subject } from "./schema";
export const DEFAULT_SCHOOLS=["ontario","kumon-canada","bayview-glen"];
export type ComparisonState={subject:Subject;schools:string[];grade:string};
export function parseState(params:URLSearchParams, validSchools:string[]):ComparisonState { const subjectValue=params.get("subject"); const subject=subjects.includes(subjectValue as Subject)?subjectValue as Subject:"math"; const requested=params.get("schools")?.split(",").filter(Boolean)??DEFAULT_SCHOOLS; const schools=[...new Set(requested)].filter(id=>validSchools.includes(id)); return {subject,schools:schools.length?schools:DEFAULT_SCHOOLS.filter(id=>validSchools.includes(id)),grade:params.get("grade")??"1"}; }
export function serializeState(state:ComparisonState){const p=new URLSearchParams();p.set("subject",state.subject);p.set("schools",state.schools.join(","));p.set("grade",state.grade);return `?${p.toString()}`;}
