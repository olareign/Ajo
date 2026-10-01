import { render, screen } from "@testing-library/react";
import { CircleRing } from "./CircleRing";

const members = [
  { name: "Adébáyọ̀ Ola", status: "paid" as const },
  { name: "Grace Ogunyemi", status: "paid" as const },
  { name: "Funmi Ojo", status: "pending" as const },
  { name: "Chidi Obi", status: "late" as const },
];

describe("CircleRing", () => {
  it("describes the whole circle in words for screen readers", () => {
    render(<CircleRing members={members} recipient={2} you={0} title="Aso Ebi, round 3" />);
    expect(screen.getByRole("img")).toHaveAccessibleName(
      "Aso Ebi, round 3. Adébáyọ̀ Ola (you): paid; Grace Ogunyemi: paid; Funmi Ojo: receives this round; Chidi Obi: late",
    );
  });

  it("draws one bead per member with initials, in spot order", () => {
    const { container } = render(<CircleRing members={members} recipient={2} />);
    const beads = [...container.querySelectorAll("[data-bead]")];
    expect(beads.map((b) => b.textContent)).toEqual(["AO", "GO", "FO", "CO"]);
    expect(beads.map((b) => b.getAttribute("data-bead"))).toEqual([
      "paid",
      "paid",
      "recipient",
      "late",
    ]);
  });

  it("marks the signed-in member", () => {
    const { container } = render(<CircleRing members={members} you={1} />);
    expect(container.querySelectorAll("[data-you]")).toHaveLength(1);
  });

  it("shows the pot in the middle when given", () => {
    render(<CircleRing members={members} center={{ label: "POT", value: "₦80,000" }} />);
    expect(screen.getByText("₦80,000")).toBeInTheDocument();
  });

  describe("with photos", () => {
    const withPhotos = [
      { name: "Adébáyọ̀ Ola", status: "paid" as const, photo: "/people/ola.jpg" },
      { name: "Grace Ogunyemi", status: "pending" as const, photo: "/people/grace.jpg" },
      { name: "Funmi Ojo", status: "paid" as const },
    ];

    it("shows a member's photo in their bead, and nothing for members without one", () => {
      const { container } = render(<CircleRing members={withPhotos} recipient={0} />);
      const images = [...container.querySelectorAll("image")];
      expect(images.map((i) => i.getAttribute("href"))).toEqual([
        "/people/ola.jpg",
        "/people/grace.jpg",
      ]);
    });

    it("keeps initials underneath, so a photo that fails to load still leaves a name", () => {
      const { container } = render(<CircleRing members={withPhotos} />);
      const beads = [...container.querySelectorAll("[data-bead]")];
      expect(beads.map((b) => b.textContent)).toEqual(["AO", "GO", "FO"]);
    });

    it("does not rely on colour alone: pending is dashed, paid is solid", () => {
      const { container } = render(<CircleRing members={withPhotos} />);
      const rings = [...container.querySelectorAll("[data-bead] circle[data-ring]")];
      expect(rings[0]!.getAttribute("stroke-dasharray")).toBeNull();
      expect(rings[1]!.getAttribute("stroke-dasharray")).not.toBeNull();
    });

    it("keeps the photos out of the accessibility tree; the circle is described in words", () => {
      render(<CircleRing members={withPhotos} />);
      expect(screen.getAllByRole("img")).toHaveLength(1);
    });
  });
});
