import { money } from "@ajo/domain";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { GroupSummary } from "@/components/GroupCard";
import { GroupsScreen } from "./GroupsScreen";

const group = (id: string, name: string): GroupSummary => ({
  id,
  name,
  status: "active",
  contribution: money(1_000_000, "NGN"),
  frequency: "weekly",
  size: 7,
  memberCount: 5,
  nextDueDate: "2027-01-19",
  members: [],
});

describe("GroupsScreen", () => {
  it("shows private groups first", () => {
    render(
      <GroupsScreen
        locale="en-NG"
        privateGroups={[group("a", "Aso Ebi"), group("p", "Phone Gang")]}
        publicGroups={[group("l", "Plot of Land")]}
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Groups" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Private Groups" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("heading", { name: "Aso Ebi" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Phone Gang" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Plot of Land" })).not.toBeInTheDocument();
  });

  it("switches to public groups", async () => {
    render(
      <GroupsScreen
        locale="en-NG"
        privateGroups={[group("a", "Aso Ebi")]}
        publicGroups={[group("l", "Plot of Land")]}
      />,
    );
    await userEvent.click(screen.getByRole("tab", { name: "Public Groups" }));

    expect(screen.getByRole("tab", { name: "Public Groups" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName("Public Groups");
    expect(screen.getByRole("heading", { name: "Plot of Land" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Aso Ebi" })).not.toBeInTheDocument();
  });

  it("invites the user to start a group when they have none", () => {
    render(<GroupsScreen locale="en-NG" privateGroups={[]} publicGroups={[]} />);
    expect(screen.getByText("You are not in any private group yet.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start a group" })).toHaveAttribute(
      "href",
      "/groups/new",
    );
  });

  it("shows the main navigation with Groups selected", () => {
    render(<GroupsScreen locale="en-NG" privateGroups={[]} publicGroups={[]} />);
    expect(screen.getByRole("link", { name: "Groups" })).toHaveAttribute("aria-current", "page");
  });
});
