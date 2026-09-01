import type { School, Source } from "../../src/lib/schema";
export const sources:Source[]=[
 {id:"on-curriculum",canonicalUrl:"https://www.dcp.edu.gov.on.ca/en/curriculum/",publisher:"Ontario Ministry of Education",accessDate:"2026-09-01",pageTitle:"Curriculum and Resources",kind:"official-requirement"},
 {id:"kumon-math",canonicalUrl:"https://www.kumon.com/ca-en/math-program",publisher:"Kumon Canada",accessDate:"2026-09-01",pageTitle:"Math Program",kind:"official-requirement"},
 {id:"kumon-reading",canonicalUrl:"https://www.kumon.com/ca-en/reading-program",publisher:"Kumon Canada",accessDate:"2026-09-01",pageTitle:"Reading Program",kind:"official-requirement"},
 {id:"bvg-lower",canonicalUrl:"https://www.bayviewglen.ca/schools/lower-school/curriculum/",publisher:"Bayview Glen",accessDate:"2026-09-01",pageTitle:"Lower School Curriculum",kind:"school-published"},
 {id:"bvg-prep",canonicalUrl:"https://www.bayviewglen.ca/schools/prep-school/curriculum/",publisher:"Bayview Glen",accessDate:"2026-09-01",pageTitle:"Prep School Curriculum",kind:"school-published"},
];
const all=["JK","SK","1","2","3","4","5","6","7","8","9","10","11","12"] as const;
export const schools:School[]=[
 {id:"ontario",name:"Ontario Curriculum",shortName:"Ontario",type:"public-curriculum",url:sources[0].canonicalUrl,location:"Ontario, Canada",supportedGrades:[...all],methodology:"Provincial curriculum requirements organized by grade and strand.",sourceIds:["on-curriculum"],reviewed:true},
 {id:"kumon-canada",name:"Kumon Canada",shortName:"Kumon",type:"supplemental-program",url:"https://www.kumon.com/ca-en/",location:"Canada",supportedGrades:[...all],methodology:"Individualized worksheet progression; levels do not map exactly to school grades.",sourceIds:["kumon-math","kumon-reading"],reviewed:true},
 {id:"bayview-glen",name:"Bayview Glen",shortName:"Bayview Glen",type:"independent-school",url:"https://www.bayviewglen.ca/",location:"Toronto, Ontario",supportedGrades:[...all],methodology:"School-published Lower and Prep School curriculum summaries.",sourceIds:["bvg-lower","bvg-prep"],reviewed:true},
 ...[["tfs","TFS – Canada’s International School"],["havergal","Havergal College"],["ucc","Upper Canada College"],["branksome","Branksome Hall"],["crescent","Crescent School"],["bss","The Bishop Strachan School"],["smcs","St. Michael’s College School"],["tms","Toronto Montessori Schools"]].map(([id,name])=>({id,name,shortName:name,type:"independent-school" as const,url:"https://example.invalid/registry-only",location:"Ontario, Canada",supportedGrades:[...all],methodology:"Registry entry awaiting source review.",sourceIds:["on-curriculum"],reviewed:false}))
];
