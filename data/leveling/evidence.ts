import type { Evidence } from "../../src/lib/schema";

export const ACCESSED = "2026-09-01";

export const ontarioEvidence: Evidence[] = [
  {
    id: "on-kindergarten",
    kind: "official-curriculum",
    publisher: "Government of Ontario",
    title: "Kindergarten",
    canonicalUrl: "https://www.ontario.ca/page/kindergarten",
    accessDate: ACCESSED,
    quote: "Kindergarten is a free 2-year program for 4- and 5-year-old children. When children turn 6 years old, they must attend school in September of that year.",
    corroboration: "not-applicable",
  },
  {
    id: "on-elementary-math",
    kind: "official-curriculum",
    publisher: "Ontario Ministry of Education",
    title: "The Ontario Curriculum, Grades 1–8: Mathematics",
    canonicalUrl: "https://www.dcp.edu.gov.on.ca/en/curriculum/elementary-mathematics",
    accessDate: ACCESSED,
    corroboration: "not-applicable",
  },
  {
    id: "on-elementary-language",
    kind: "official-curriculum",
    publisher: "Ontario Ministry of Education",
    title: "The Ontario Curriculum, Grades 1–8: Language",
    canonicalUrl: "https://www.dcp.edu.gov.on.ca/en/curriculum/elementary-language",
    accessDate: ACCESSED,
    corroboration: "not-applicable",
  },
  {
    id: "on-grade9-math",
    kind: "official-curriculum",
    publisher: "Ontario Ministry of Education",
    title: "The Ontario Curriculum, Grade 9: Mathematics, De-streamed (MTH1W)",
    canonicalUrl: "https://www.dcp.edu.gov.on.ca/en/curriculum/secondary-mathematics/courses/mth1w",
    accessDate: ACCESSED,
    quote: "Effective September 2021, all mathematics programs for Grade 9 will be based on the expectations outlined on this site.",
    corroboration: "not-applicable",
  },
  {
    id: "on-fsl",
    kind: "official-curriculum",
    publisher: "Government of Ontario",
    title: "French as a second language programs",
    canonicalUrl: "https://www.ontario.ca/page/french-second-language-programs",
    accessDate: ACCESSED,
    quote: "At the elementary level, students must accumulate a minimum of 600 hours of French instruction by the end of Grade 8. […] In the French immersion program, students learn French as a subject and take two or more other subjects where French is the language of instruction. At the elementary level, at least 50% of all instruction is provided in French.",
    corroboration: "not-applicable",
  },
  {
    id: "on-ossd",
    kind: "official-curriculum",
    publisher: "Government of Ontario",
    title: "Ontario Schools, Kindergarten to Grade 12: Diploma and certificate requirements",
    canonicalUrl: "https://www.ontario.ca/document/ontario-schools-kindergarten-grade-12-policy-and-program-requirements/diploma-and-certificate-requirements-related-procedures",
    accessDate: ACCESSED,
    quote: "Students entering Grade 9 in 2024-25 onwards must earn a minimum of 30 credits, including 17 compulsory credits and 13 optional credits with at least two of the 30 credits earned online.",
    corroboration: "not-applicable",
  },
];
