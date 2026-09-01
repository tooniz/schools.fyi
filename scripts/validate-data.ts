import { expectations, schools, sources } from "../data/schools";import { validateData } from "../src/lib/validation";
const result=validateData({schools,sources,expectations});console.log(`Validated ${result.schools.length} schools, ${result.sources.length} sources, and ${result.expectations.length} expectations.`);
