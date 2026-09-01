import { subjects, type Subject } from "./schema";
export const DEFAULT_SCHOOLS=["ontario","ap","ib","bayview-glen"];
export type ComparisonState={subject:Subject;schools:string[]};
export function parseState(params:URLSearchParams, validSchools:string[]):ComparisonState { const subjectValue=params.get("subject"); const subject=subjects.includes(subjectValue as Subject)?subjectValue as Subject:"math"; const requested=params.get("schools")?.split(",").filter(Boolean)??DEFAULT_SCHOOLS; const schools=[...new Set(requested)].filter(id=>validSchools.includes(id)); return {subject,schools:schools.length?schools:DEFAULT_SCHOOLS.filter(id=>validSchools.includes(id))}; }
export function serializeState(state:ComparisonState){const p=new URLSearchParams();p.set("subject",state.subject);p.set("schools",state.schools.join(","));return `?${p.toString()}`;}
