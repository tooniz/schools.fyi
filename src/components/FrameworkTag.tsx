import type { Program } from "@/lib/schema";

/** A school delivering the IB or AP is two things at once. The badge says which
 *  framework, because hue alone cannot tell IB from AP and should not have to.
 *  Its weight says how far the framework reaches: a filled badge is the
 *  school's own programme, an outlined one is a set of senior electives inside
 *  an Ontario school. */
const FRAMEWORKS = {
  ib: { label: "IB", name: "International Baccalaureate" },
  ap: { label: "AP", name: "Advanced Placement" },
} as const;

const SCOPES = {
  curriculum: (name: string) => `Runs the ${name} as its own curriculum`,
  courses: (name: string) => `Ontario curriculum with ${name} courses offered in the senior years`,
} as const;

export const frameworkLabel = (framework: NonNullable<Program["framework"]>) => FRAMEWORKS[framework].label;

export function FrameworkTag({ framework, scope }: { framework?: Program["framework"]; scope?: Program["frameworkScope"] }) {
  if (!framework || !scope) return null;
  const { label, name } = FRAMEWORKS[framework];
  const title = SCOPES[scope](name);
  return (
    <span className="framework-tag" data-scope={scope} title={title}>
      <span aria-hidden="true">{label}</span>
      <span className="visually-hidden">{` — ${title}`}</span>
    </span>
  );
}
