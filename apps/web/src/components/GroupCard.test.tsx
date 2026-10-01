import { money } from "@ajo/domain";
import { render, screen } from "@testing-library/react";
import { GroupCard } from "./GroupCard";

const asoEbi = {
  id: "aso-ebi",
  name: "Aso Ebi",
  status: "active" as const,
  contribution: money(1_000_000, "NGN"),
  frequency: "weekly" as const,
  size: 7,
  memberCount: 5,
  nextDueDate: "2027-01-19",
  members: [
    { id: "1", name: "Adenike Aiyegbiorju" },
    { id: "2", name: "Grace Ogunyemi" },
    { id: "3", name: "Funmi Ojo" },
    { id: "4", name: "Segun Ade" },
    { id: "5", name: "Tolu Bello" },
  ],
};

describe("GroupCard", () => {
  it("shows the group summary as in the Groups design", () => {
    render(<GroupCard group={asoEbi} locale="en-NG" />);

    expect(screen.getByRole("heading", { name: "Aso Ebi" })).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("₦70,000")).toBeInTheDocument();
    expect(screen.getByText(/₦10K weekly/)).toBeInTheDocument();
    expect(screen.getByText("19 Jan")).toBeInTheDocument();
    expect(screen.getByText("2/7 remaining")).toBeInTheDocument();
  });

  it("formats the due date for the user's locale", () => {
    render(<GroupCard group={asoEbi} locale="en-US" />);
    expect(screen.getByText("Jan 19")).toBeInTheDocument();
  });

  it("shows up to three avatars and a count of the rest", () => {
    render(<GroupCard group={asoEbi} locale="en-NG" />);
    expect(screen.getAllByTestId("avatar")).toHaveLength(3);
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("shows how full the group is", () => {
    render(<GroupCard group={asoEbi} locale="en-NG" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "71");
  });

  it("links to the group page", () => {
    render(<GroupCard group={asoEbi} locale="en-NG" />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/groups/aso-ebi");
  });

  it("says Full instead of 0 remaining", () => {
    render(<GroupCard group={{ ...asoEbi, memberCount: 7 }} locale="en-NG" />);
    expect(screen.getByText("Full")).toBeInTheDocument();
  });
});
