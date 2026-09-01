# schools.fyi

A minimal, independent, source-aware comparison of Ontario learning progressions. Next.js App Router pages consume a `CurriculumRepository`; the current file-backed implementation can later be replaced by PostgreSQL/Supabase without changing UI component contracts.

## Development and checks

Requires Node 20.9+. Run `npm install`, then `npm run dev`. Quality gates are `npm run validate:data`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.

## Data workflow

Reviewed data lives under `data/<provider>/<subject>.ts`, not in components. Add a canonical `Source`, a registry `School`, and expectations with separate source wording and normalized labels. Every published expectation requires a source; the validator rejects unknown references and duplicate school/subject/grade/strand keys. Follow `CONTRIBUTING.md`, verify primary sources, record access/review dates, run all gates, and request editorial review. Registry-only schools stay hidden until a subject-grade source is reviewed.

## Deployment

Import the repository into Vercel and use the standard Next.js preset (`npm run build`); no environment variables or database are required. For optional static hosting run `STATIC_EXPORT=true npm run build` and deploy `out/`. The contribution form intentionally links to a GitHub review queue and should be updated if the repository moves.

## Scope and limitations

The seed columns are Ontario, Kumon Canada, and Bayview Glen. Kumon is ability-based rather than grade-equivalent, and Bayview Glen public pages do not provide expectation-level detail for every grade; unavailable detail is explicitly labeled rather than inferred. Alignments are editorial aids, not accreditation, placement advice, or formal equivalencies.
