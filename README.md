# schools.fyi

A levels.fyi-style leveling comparison for Ontario schools. The home page lines up Toronto independent schools against the Ontario curriculum by **how far through the learning sequence each level sits**, not by the grade number printed on it — so an accelerated Grade 5 can appear against Ontario Grade 6.

## How the leveling works

Ontario is the reference axis: each Ontario grade occupies exactly one progress row, JK through Grade 12, plus a small region for work that sits past Grade 12. Every other program is described by `OffsetRule`s in `data/leveling/`, one per program, subject, and grade band:

- **`offsetYears`** shifts a level along the axis. Fractional values are allowed and used — `+0.5` means the level is placed half a grade ahead.
- **`spanYears`** stretches a level across more than one Ontario row. This is how curriculum compression is shown: TFS covers Ontario Grades 6–8 in two years, so those two levels are drawn 1.5 rows tall.
- **`coverage`** marks bands a program does not teach, which is how Ontario's missing core French before Grade 4 is represented rather than faked.
- **`confidence`** is one of `documented`, `approximate`, `community-reported`, or `insufficient-evidence`. A zero offset backed by an explicit school statement ("depth rather than breadth") is *documented*, not *insufficient evidence*; the two are kept distinct.
- **`acceleratedPathway`** records an opt-in faster route (reach-ahead credits, streamed senior courses) without averaging a minority track into the whole cohort's level.
- **`evidenceIds`** must resolve, and official/school sources are displayed separately from community discussion.

The validator enforces that every taught grade of every program has exactly one rule per subject, that bands do not double-cover a grade, and that a program's levels never stop moving forward along the axis. Overlap *is* allowed, because convergence is real — a level that overlaps its predecessor is drawn in a second lane so both stay readable.

## Development and checks

Requires Node 20.9+. Run `npm install`, then `npm run dev`. Quality gates are `npm run validate:data`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.

## Data workflow

Leveling data lives under `data/leveling/`: `programs.ts` (columns and their own level names), `evidence.ts` and `school-evidence.ts` (every citable source, with the quote that supports the placement), and `offsets.ts` and `school-offsets.ts` (the rules). Expectation-level detail for the older strand-by-strand comparison lives under `data/<provider>/<subject>.ts`.

To add or change a placement: quote a primary source, record its URL and access date, write the `claim` and `rationale` so a reader can disagree with your reasoning, and pick the confidence tier honestly. Follow `CONTRIBUTING.md` and run all gates.

## Deployment

Pushes to `main` deploy a static export to the default GitHub Pages project URL. In the repository's **Settings → Pages**, select **GitHub Actions** as the source. The deployment workflow supplies GitHub's project base path, builds the site, and publishes `out/`; no environment variables or database are required.

To reproduce the Pages build locally, run `STATIC_EXPORT=true NEXT_PUBLIC_BASE_PATH=/schools.fyi npm run build` and serve `out/`. The contribution form intentionally links to a GitHub review queue and should be updated if the repository moves.

## Scope and limitations

The columns are Ontario, Bayview Glen, Havergal College, The Bishop Strachan School, and TFS — Canada's International School, across mathematics, English/language, and French.

What the current data does and does not support:

- **Bayview Glen** is the clearest whole-cohort acceleration. Its Director of Teaching and Learning states the mapping outright — "Our Senior Kindergarten students do the Grade 1 math curriculum, and our Grade 1s do the Grade 2 curriculum–and so on" — the Prep School page claims students work "one year ahead of their peers in other schools", and the Grade 6 booklet prints its mathematics section under a "Grade 7 Curriculum" heading. Mathematics is `+1.0` and `documented` from SK to Grade 8.
- **TFS** is the most structurally different: the school states that "our students have earned most Ontario Grade 9, 10 and 11 credits a year ahead of their peers in the province", and it compresses Ontario Grades 6–8 into two years. It is also the only program that sits *behind* Ontario anywhere — there is no English instruction at all before Grade 2, because "from Jardin d'éveil Hafez (age 2) to Grade 1, our program is entirely in French".
- **Havergal** is placed level with Ontario in mathematics and English *by its own stated design* — it teaches "for depth rather than for breadth" and is openly sceptical of condensed programs. French is the exception and is `+1.0` for every student from Grade 3 through Grade 9: the course calendar has Grade 7 taking Grade 8 French and Grade 8 taking FSF1D, the Ontario Grade 9 course, "for all students".
- **BSS** keeps the Ontario sequence, and its Junior School page is specific enough to check: the number range taught in each grade (to 50 in Grade 1, to 10,000 in Grade 4, to 1,000,000 in Grade 6) matches Ontario exactly, grade for grade. Its one documented acceleration is an opt-in Grade 7–8 math and French stream, which 25% of Grade 8 students use to earn a Grade 9 credit. That minority track is recorded as a pathway rather than blended into the cohort's level.
- **Same-position convergence is shown, not smoothed away.** Bayview Glen's Grade 8 and Grade 9 both sit at Ontario Grade 9 in mathematics, because the elementary lead is banked as credits and the Upper School re-anchors to Ontario course codes. The validator rejects only true inversions.
- **French offsets are floors, not measurements.** Ontario's core French ladder (600 hours by Grade 8) cannot express how far ahead a French-medium school is; TFS teaches French "at a mother tongue level" and is capped at `+3` for that reason, and says so in its rationale.
- Kindergarten placements are marked `insufficient-evidence` because no school publishes a Kindergarten comparison against Ontario's.
- **Community and forum evidence on these schools' grade mappings is close to non-existent**, and the data reflects that rather than padding it. Searches across Reddit, RedFlagDeals, College Confidential, and parenting forums produced no thread in which anyone claims a specific grade offset for any of these four schools. Two attribution traps are worth knowing about: a widely-surfaced PDF labelled "Academic Program" is **Greenwood College School's** handbook, not BSS's, and a "curriculum that runs ahead of the Ontario standard" line belongs to a tutoring company advertising itself. Neither is cited here. Directory sources (Our Kids, Wikipedia) are labelled `secondary-directory` rather than dressed up as primary.

Alignments are editorial aids, not accreditation, placement advice, or formal equivalencies.
