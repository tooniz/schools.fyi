import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { levelingDataset } from "@data/leveling";
import { LevelingMatrix } from "./LevelingMatrix";

afterEach(() => { cleanup(); history.replaceState(null, "", "/"); });

const column = (name: string) => screen.getByRole("article", { name });
const cell = (program: string, name: RegExp) => within(column(program)).getByRole("button", { name });
const varOf = (element: HTMLElement, name: string) => element.style.getPropertyValue(name);
const tracks = () => within(screen.getByRole("list", { name: "Programs being compared" })).getAllByRole("listitem").map((item) => item.textContent ?? "");
const renderPrograms = (programs: string[], subject = "mathematics") => {
  history.replaceState(null, "", `/?subject=${subject}&programs=${programs.join(",")}`);
  return render(<LevelingMatrix dataset={levelingDataset} />);
};

describe("LevelingMatrix", () => {
  it("offers a subject switcher and a track per selected program", () => {
    render(<LevelingMatrix dataset={levelingDataset} />);
    expect(screen.getByRole("tab", { name: "Mathematics" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "French" })).toHaveAttribute("aria-selected", "false");
    expect(tracks()).toHaveLength(5);
    expect(tracks()[0]).toContain("Ontario");
  });

  it("labels rows by Ontario progress step and adds room past Grade 12", () => {
    render(<LevelingMatrix dataset={levelingDataset} />);
    const axis = screen.getByText("Ontario progress").parentElement!;
    expect(within(axis).getByText("L7")).toBeInTheDocument();
    expect(within(axis).getByText("Grade 5")).toBeInTheDocument();
    expect(within(axis).getByText("Past Gr 12")).toBeInTheDocument();
  });

  it("places an accelerated level on the Ontario row it actually matches", () => {
    renderPrograms(["ontario", "tfs"]);
    const tfsLevelOne = cell("Toronto French School", /Level I\b/);
    expect(varOf(tfsLevelOne, "--top")).toBe(varOf(cell("Ontario Curriculum", /^Grade 9$/), "--top"));
    expect(within(tfsLevelOne).getByText("+1 yr")).toBeInTheDocument();
  });

  it("draws TFS's compressed middle years taller than one Ontario row", () => {
    renderPrograms(["ontario", "tfs"]);
    const compressed = cell("Toronto French School", /^Grade 6/);
    expect(Number(varOf(compressed, "--height"))).toBeGreaterThan(Number(varOf(cell("Ontario Curriculum", /^Grade 6$/), "--height")));
    expect(within(compressed).getByText("1.5× pace")).toBeInTheDocument();
  });

  it("stretches a level back over the gap its jump would otherwise leave", () => {
    render(<LevelingMatrix dataset={levelingDataset} />);
    const jk = cell("Bayview Glen", /^JK$/);
    const sk = cell("Bayview Glen", /^SK/);
    expect(Number(varOf(sk, "--top"))).toBeCloseTo(Number(varOf(jk, "--top")) + Number(varOf(jk, "--height")));
    expect(Number(varOf(sk, "--height"))).toBe(2);
  });

  it("stacks converging levels instead of overlapping them, and grows the rows across", () => {
    render(<LevelingMatrix dataset={levelingDataset} />);
    const grade8 = cell("Bayview Glen", /^Grade 8/);
    const grade9 = cell("Bayview Glen", /^Grade 9/);
    expect(Number(varOf(grade9, "--top"))).toBeCloseTo(Number(varOf(grade8, "--top")) + Number(varOf(grade8, "--height")));
    expect(Number(varOf(cell("Ontario Curriculum", /^Grade 9$/), "--height"))).toBe(2);
  });

  it("keeps Havergal maths on the Ontario row but moves its junior French ahead", async () => {
    const user = userEvent.setup();
    render(<LevelingMatrix dataset={levelingDataset} />);
    expect(varOf(cell("Havergal College", /^Grade 3$/), "--top")).toBe(varOf(cell("Ontario Curriculum", /^Grade 3$/), "--top"));
    await user.click(screen.getByRole("tab", { name: "French" }));
    const french = cell("Havergal College", /^Grade 3/);
    expect(within(french).getByText("+1 yr")).toBeInTheDocument();
    await user.click(french);
    expect(screen.getByRole("dialog", { name: "Havergal College: Grade 3" })).toHaveTextContent("Sits at Ontario Grade 4");
  });

  it("shows Ontario teaching no French before Grade 4", async () => {
    const user = userEvent.setup();
    renderPrograms(["ontario", "bishop-strachan"]);
    await user.click(screen.getByRole("tab", { name: "French" }));
    expect(cell("Ontario Curriculum", /^Grade 1\s*not taught$/)).toBeInTheDocument();
    expect(cell("Ontario Curriculum", /^Grade 4$/)).toBeInTheDocument();
    expect(cell("Bishop Strachan School", /^JK$/)).toBeInTheDocument();
  });

  it("switches Ontario from Core French to French Immersion inside one column", async () => {
    const user = userEvent.setup();
    render(<LevelingMatrix dataset={levelingDataset} />);
    await user.click(screen.getByRole("tab", { name: "French" }));
    expect(cell("Ontario Curriculum", /^Grade 1\s*not taught$/)).toBeInTheDocument();
    await user.selectOptions(screen.getByRole("combobox", { name: "Ontario Curriculum pathway" }), "french-immersion");
    const grade1 = cell("Ontario Curriculum", /^Grade 1\b/);
    expect(within(grade1).getByText("+3 yrs · advanced")).toBeInTheDocument();
    expect(location.search).toContain("french-immersion");
  });

  it("opens a cell dialog above the scrolling matrix, with sources split by type", async () => {
    const user = userEvent.setup();
    render(<LevelingMatrix dataset={levelingDataset} />);
    await user.click(cell("Bayview Glen", /^Grade 5/));
    const dialog = screen.getByRole("dialog", { name: "Bayview Glen: Grade 5" });
    expect(dialog.closest(".matrix-scroll")).toBeNull();
    expect(dialog).toHaveTextContent("Sits at Ontario Grade 6");
    expect(dialog).toHaveTextContent("a full grade ahead of Ontario");
    expect(dialog).toHaveTextContent("Content timing");
    expect(dialog).toHaveTextContent("Depth not separately assessed");
    expect(dialog).toHaveTextContent("Pace not separately assessed");
    expect(within(dialog).getByText("Official and school sources")).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: /Prep School Curriculum, Grade 7/ })).toHaveAttribute("href", "https://www.bayviewglen.ca/wp-content/uploads/2022/09/BVG_PS_Curriculum_Grade7_2022-2023_Final_Sep9_spreads.pdf");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows TFS teaching no English before Grade 2 rather than leaving a blank gap", async () => {
    const user = userEvent.setup();
    renderPrograms(["ontario", "tfs"]);
    await user.click(screen.getByRole("tab", { name: "English / Language" }));
    const grade1 = cell("Toronto French School", /^Grade 1\s*not taught$/);
    await user.click(grade1);
    const dialog = screen.getByRole("dialog", { name: "Toronto French School: Grade 1" });
    expect(dialog).toHaveTextContent("not taught at this stage, so there is no level to compare");
    expect(dialog).toHaveTextContent("entirely in French");
  });

  it("labels the years outside a program's range instead of leaving them blank", async () => {
    const user = userEvent.setup();
    render(<LevelingMatrix dataset={levelingDataset} />);
    await user.click(screen.getByRole("button", { name: "Add program" }));
    await user.click(screen.getByRole("button", { name: "Add Richmond Hill Montessori" }));
    expect(within(column("Richmond Hill Montessori")).getByText("RHMS ends after Grade 8")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add University of Toronto Schools" }));
    expect(within(column("University of Toronto Schools")).getByText("UTS starts at Grade 7")).toBeInTheDocument();
  });

  it("keeps an opt-in stream out of the cohort level but names it in the detail", async () => {
    const user = userEvent.setup();
    renderPrograms(["ontario", "bishop-strachan"]);
    await user.click(cell("Bishop Strachan School", /^Grade 8/));
    const dialog = screen.getByRole("dialog", { name: "Bishop Strachan School: Grade 8" });
    expect(dialog).toHaveTextContent("Sits at Ontario Grade 8");
    expect(dialog).toHaveTextContent("Faster route available");
    expect(dialog).toHaveTextContent("25% of Grade 8 students");
  });

  it("reveals non-ranked outcomes context and explains why EQAO is absent", async () => {
    const user = userEvent.setup();
    render(<LevelingMatrix dataset={levelingDataset} />);
    await user.click(screen.getByRole("button", { name: "Show outcomes" }));
    expect(screen.getByRole("heading", { name: "Latest official post-secondary disclosures" })).toBeInTheDocument();
    expect(screen.getByText("Canada")).toBeInTheDocument();
    expect(screen.getByText("71%")).toBeInTheDocument();
    expect(screen.getByText(/Why EQAO is absent/)).toBeInTheDocument();
    expect(location.search).toContain("outcomes=university");
  });

  it("explains when a subject falls outside a curriculum instead of calling it unresearched", () => {
    renderPrograms(["ontario", "common-core"], "french");
    const commonCore = column("Common Core + NGSS");
    expect(within(commonCore).getByText("outside this curriculum")).toBeInTheDocument();
    expect(within(commonCore).getByText(/do not define French-language standards/)).toBeInTheDocument();
    expect(within(commonCore).queryByRole("link", { name: "Send us a source" })).not.toBeInTheDocument();
  });
});

describe("program picker", () => {
  const openPicker = async (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole("button", { name: "Add program" }));

  it("appends a new track on the right and drops the oldest past five", async () => {
    const user = userEvent.setup();
    render(<LevelingMatrix dataset={levelingDataset} />);
    expect(tracks()[0]).toContain("Ontario");
    await openPicker(user);
    await user.click(screen.getByRole("button", { name: "Add International Baccalaureate" }));
    const updated = tracks();
    expect(updated).toHaveLength(5);
    expect(updated[4]).toContain("IB");
    expect(updated.join(" ")).not.toContain("Ontario");
    expect(location.search).not.toContain("ontario");
  });

  it("keeps pinned tracks and evicts the oldest unpinned track", async () => {
    const user = userEvent.setup();
    render(<LevelingMatrix dataset={levelingDataset} />);
    await user.click(screen.getByRole("button", { name: "Pin Ontario Curriculum" }));
    expect(screen.getByRole("button", { name: "Unpin Ontario Curriculum" })).toHaveAttribute("aria-pressed", "true");
    expect(location.search).toContain("pinned=ontario");

    await openPicker(user);
    await user.click(screen.getByRole("button", { name: "Add International Baccalaureate" }));
    const updated = tracks().join(" ");
    expect(updated).toContain("Ontario");
    expect(updated).not.toContain("BVG");
    expect(updated).toContain("IB");
  });

  it("blocks FIFO additions when all five tracks are pinned", async () => {
    const user = userEvent.setup();
    render(<LevelingMatrix dataset={levelingDataset} />);
    for (const name of ["Ontario Curriculum", "Bayview Glen", "Upper Canada College", "Havergal College", "Branksome Hall"]) {
      await user.click(screen.getByRole("button", { name: `Pin ${name}` }));
    }
    await openPicker(user);
    expect(screen.getByText("All five tracks are pinned. Unpin one to add another.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add International Baccalaureate" })).toBeDisabled();
  });

  it("only offers programs that are not already being compared", async () => {
    const user = userEvent.setup();
    render(<LevelingMatrix dataset={levelingDataset} />);
    await openPicker(user);
    expect(screen.getByRole("button", { name: "Add International Baccalaureate" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Branksome Hall" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove Branksome Hall" })).not.toBeInTheDocument();
  });

  it("orders curricula, frameworks, schools, then enrichment programs", async () => {
    const user = userEvent.setup();
    render(<LevelingMatrix dataset={levelingDataset} />);
    await openPicker(user);
    const additions = screen.getAllByRole("button")
      .map((button) => button.getAttribute("aria-label"))
      .filter((label): label is string => Boolean(label?.startsWith("Add ")) && label !== "Add program");
    const position = (name: string) => additions.indexOf(`Add ${name}`);
    expect(position("British Columbia Curriculum")).toBeLessThan(position("International Baccalaureate"));
    expect(position("International Baccalaureate")).toBeLessThan(position("Bishop Strachan School"));
    expect(position("Bishop Strachan School")).toBeLessThan(position("Kumon"));
  });

  it("filters the offered programs by search", async () => {
    const user = userEvent.setup();
    render(<LevelingMatrix dataset={levelingDataset} />);
    await openPicker(user);
    await user.type(screen.getByRole("searchbox", { name: "Search programs" }), "baccalaureate");
    expect(screen.getByRole("button", { name: "Add International Baccalaureate" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Advanced Placement" })).not.toBeInTheDocument();
  });

  it("offers the new public curriculum comparators", async () => {
    const user = userEvent.setup();
    render(<LevelingMatrix dataset={levelingDataset} />);
    await openPicker(user);
    for (const name of ["British Columbia Curriculum", "England Curriculum", "Common Core + NGSS"]) {
      expect(screen.getByRole("button", { name: `Add ${name}` })).toBeInTheDocument();
    }
  });

  it("offers York School and switches its mathematics pathway in-column", async () => {
    const user = userEvent.setup();
    render(<LevelingMatrix dataset={levelingDataset} />);
    await openPicker(user);
    await user.type(screen.getByRole("searchbox", { name: "Search programs" }), "York School");
    await user.click(screen.getByRole("button", { name: "Add The York School" }));
    const york = column("The York School");
    const grade8 = within(york).getByRole("button", { name: /^Grade 8 · MYP/ });
    expect(within(grade8).queryByText("+1 yr")).not.toBeInTheDocument();
    await user.selectOptions(within(york).getByRole("combobox", { name: "The York School pathway" }), "accelerated-math");
    expect(within(within(york).getByRole("button", { name: /^Grade 8 · MYP/ })).getByText(/\+1 yr/)).toBeInTheDocument();
  });

  it("removes a track from its chip and keeps the URL in step", async () => {
    const user = userEvent.setup();
    renderPrograms(["ontario", "tfs", "ucc"]);
    await user.click(screen.getByRole("tab", { name: "English / Language" }));
    expect(location.search).toContain("subject=language");
    await user.click(screen.getByRole("button", { name: "Remove Toronto French School from the comparison" }));
    expect(tracks().join(" ")).not.toContain("TFS");
    expect(location.search).not.toContain("tfs");
  });
});
