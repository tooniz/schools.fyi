import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { alignmentLevels, alignmentSources, comparisonEntities } from "@data/curriculums/alignment";
import { Comparison } from "./Comparison";

afterEach(() => { cleanup(); history.replaceState(null, "", "/"); });

describe("Comparison", () => {
  it("groups schools and curricula and opens source-backed level details", async () => {
    const user = userEvent.setup();
    render(<Comparison entities={comparisonEntities} levels={alignmentLevels} sources={alignmentSources} />);
    expect(screen.getByRole("group", { name: "Schools" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Curriculums" })).toBeInTheDocument();
    expect(screen.getByLabelText("Bayview Glen")).toBeChecked();
    await user.click(screen.getByRole("button", { name: /AP courses/ }));
    expect(screen.getByRole("dialog", { name: "AP: AP courses" })).toHaveTextContent("not a K–12 curriculum or grade ladder");
    expect(screen.getByRole("link", { name: /What Is AP/ })).toHaveAttribute("href", "https://apstudents.collegeboard.org/what-is-ap");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders variable spans and removes the selected-grade section", () => {
    render(<Comparison entities={comparisonEntities} levels={alignmentLevels} sources={alignmentSources} />);
    expect(screen.getByRole("button", { name: /Primary Years Programme/ }).parentElement).toHaveStyle("--span: 7.5");
    expect(screen.getByRole("button", { name: /AP courses/ }).parentElement).toHaveStyle("--span: 4");
    expect(screen.queryByText("Selected level")).not.toBeInTheDocument();
  });
});
