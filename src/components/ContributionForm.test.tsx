import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ContributionForm } from "./ContributionForm";

const programs = [
  { id: "uts", displayName: "University of Toronto Schools" },
  { id: "ontario", displayName: "Ontario Curriculum" },
];

const ENDPOINT = "https://forms.example.test/f/abc123";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  history.replaceState(null, "", "/");
});

/** Fills only the fields the form refuses to submit without. */
async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Source URL/), "https://www.utschools.ca/academics/");
  await user.type(screen.getByLabelText(/Proposed change/), "Grade 8 mathematics is a full year ahead, not half.");
  await user.type(screen.getByLabelText(/Contributor notes/), "The course calendar states it.");
  await user.type(screen.getByLabelText(/Conflict of interest/), "None.");
}

describe("ContributionForm", () => {
  it("speaks the same vocabulary as the matrix", () => {
    render(<ContributionForm programs={programs} />);
    const program = screen.getByLabelText(/Program/) as HTMLSelectElement;
    expect([...program.options].map((option) => option.value)).toEqual(["", "uts", "ontario"]);
    const subject = screen.getByLabelText(/Subject/) as HTMLSelectElement;
    expect([...subject.options].map((option) => option.value)).toEqual(["mathematics", "language", "french", "science"]);
  });

  it("prefills from the link the reader arrived on", async () => {
    history.replaceState(null, "", "/contribute?program=uts&subject=french&level=Grade+8");
    render(<ContributionForm programs={programs} />);
    await waitFor(() => expect((screen.getByLabelText(/Program/) as HTMLSelectElement).value).toBe("uts"));
    expect((screen.getByLabelText(/Subject/) as HTMLSelectElement).value).toBe("french");
    expect((screen.getByLabelText(/^Level/) as HTMLInputElement).value).toBe("Grade 8");
  });

  describe("with a hosted endpoint", () => {
    beforeEach(() => vi.stubEnv("NEXT_PUBLIC_REPORT_ENDPOINT", ENDPOINT));

    it("posts the report to the form service and confirms in place", async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();
      history.replaceState(null, "", "/contribute?program=uts&subject=mathematics&comparison=https%3A%2F%2Fschools.fyi%2F%3Fsubject%3Dmathematics");
      render(<ContributionForm programs={programs} />);
      await waitFor(() => expect((screen.getByLabelText(/Program/) as HTMLSelectElement).value).toBe("uts"));

      await fillRequired(user);
      await user.click(screen.getByRole("button", { name: "Send report" }));

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(ENDPOINT);
      expect(init.method).toBe("POST");
      expect(init.headers).toMatchObject({ Accept: "application/json" });
      const body = init.body as FormData;
      expect(body.get("program")).toBe("uts");
      expect(body.get("subject")).toBe("mathematics");
      expect(body.get("comparison")).toBe("https://schools.fyi/?subject=mathematics");
      expect(await screen.findByText(/that is in the review queue/)).toBeInTheDocument();
    });

    it("keeps the reader's work and offers a way out when the service fails", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
      const user = userEvent.setup();
      render(<ContributionForm programs={programs} />);
      await fillRequired(user);
      await user.click(screen.getByRole("button", { name: "Send report" }));

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(/returned 500/);
      expect(screen.getByLabelText(/Proposed change/)).toHaveValue("Grade 8 mathematics is a full year ahead, not half.");
    });

    it("refuses an incomplete report before spending a submission", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();
      render(<ContributionForm programs={programs} />);
      await user.type(screen.getByLabelText(/Source URL/), "https://www.utschools.ca/");
      await user.click(screen.getByRole("button", { name: "Send report" }));

      // Constraint validation stops this at the browser; the handler's own check
      // is the backstop. Either way nothing reaches the form service, which
      // matters because the free tiers meter submissions.
      expect(fetchMock).not.toHaveBeenCalled();
      expect(screen.getByLabelText(/Proposed change/)).toBeRequired();
      expect(screen.getByLabelText(/Conflict of interest/)).toBeRequired();
    });

    it("accepts a bot silently rather than telling it what failed", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();
      render(<ContributionForm programs={programs} />);
      await fillRequired(user);
      const honeypot = document.querySelector("input[name=_gotcha]") as HTMLInputElement;
      expect(honeypot).toBeTruthy();
      await user.type(honeypot, "http://spam.example");
      await user.click(screen.getByRole("button", { name: "Send report" }));

      expect(await screen.findByText(/that is in the review queue/)).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("without a hosted endpoint", () => {
    it("says where the report will go instead of offering a dead button", () => {
      render(<ContributionForm programs={programs} />);
      expect(screen.getByRole("note")).toHaveTextContent(/No hosted form is configured/);
      expect(screen.getByRole("button", { name: "Open a prefilled issue" })).toBeInTheDocument();
    });

    it("does not point at a repository nobody owns", () => {
      render(<ContributionForm programs={programs} />);
      expect(document.body.innerHTML).not.toContain("schools-fyi/schools.fyi");
    });
  });
});
