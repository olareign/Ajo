import { render, screen } from "@testing-library/react";
import { KycGate } from "./KycGate";

const me = { displayName: "Ada", email: "a@b.co", onboarded: true } as const;

describe("KycGate", () => {
  it("shows its screen to an approved person", () => {
    render(
      <KycGate me={{ ...me, kycStatus: "approved" }}>
        <p>Create a circle</p>
      </KycGate>,
    );
    expect(screen.getByText("Create a circle")).toBeInTheDocument();
  });

  it.each(["not_started", "in_progress", "rejected", undefined] as const)(
    "closes it, and leads to the passport, when the status is %s",
    (kycStatus) => {
      render(
        <KycGate me={{ ...me, kycStatus }}>
          <p>Create a circle</p>
        </KycGate>,
      );
      expect(screen.queryByText("Create a circle")).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Go to my passport" })).toHaveAttribute(
        "href",
        "/verify",
      );
    },
  );

  it("says we are checking, when that is the case", () => {
    render(
      <KycGate me={{ ...me, kycStatus: "pending" }}>
        <p>Create a circle</p>
      </KycGate>,
    );
    expect(screen.getByText(/We.re checking your details/)).toBeInTheDocument();
  });
});
