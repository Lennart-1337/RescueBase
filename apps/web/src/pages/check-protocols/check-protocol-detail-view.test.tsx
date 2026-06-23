import { render, screen, within } from "@testing-library/react";
import type { CheckProtocolDetail } from "../../lib/types";
import { CheckProtocolDetailView } from "./check-protocol-detail-view";

const detail: CheckProtocolDetail = {
  checkerName: "Anna",
  createdAt: "2026-06-23T12:08:00.000Z",
  effectiveStatus: "CONDITIONAL",
  id: "check-1",
  kit: { code: "SAN-RS-001", id: "kit-1", name: "Rucksack Fahrzeug 1" },
  deviationCount: 1,
  positionCount: 1,
  positions: [
    {
      articleId: "article-1",
      articleName: "Verbandpäckchen mittel",
      countedQuantity: 3,
      critical: false,
      discardedExpiredQuantity: 0,
      id: "position-1",
      missingQuantity: 2,
      moduleName: "Verband",
      note: "",
      requiredQuantity: 5,
      surplusQuantity: 0,
      unit: "Stück",
    },
  ],
  replenishmentOrder: { id: "order-1", status: "OPEN" },
  selectedStatus: "CONDITIONAL",
  signatureHash: "a327394bf1f20ae7bdda8d82870b9123be94b55d1d78dfdadfbf3185a97f5deb",
  signaturePngDataUrl: "data:image/png;base64,abc",
  warnings: ["Es fehlen Materialien, aber keine kritische Position."],
};

describe("CheckProtocolDetailView", () => {
  it("renders warnings and positions as structured lists", () => {
    render(<CheckProtocolDetailView detail={detail} />);

    const warningList = screen.getByRole("list", { name: "Hinweise" });
    expect(within(warningList).getByRole("listitem")).toHaveTextContent(
      "Es fehlen Materialien, aber keine kritische Position.",
    );

    const positionList = screen.getByRole("list", { name: "Positionen" });
    const position = within(positionList).getByRole("listitem");
    const badgeColumns = position.querySelectorAll(".protocol-position-badge-column");
    expect(within(position).getByText("Verbandpäckchen mittel")).toBeInTheDocument();
    expect(within(position).getByText("Verband")).toBeInTheDocument();
    expect(within(position).getByText("Fehlt 2")).toBeInTheDocument();
    expect(badgeColumns).toHaveLength(3);
    expect(within(position).getByText("Soll 5").closest(".badge")).toHaveClass(
      "protocol-badge-data",
    );
    expect(within(position).getByText("Gezählt 3").closest(".badge")).toHaveClass(
      "protocol-badge-data",
    );
    expect(within(position).getByText("Fehlt 2").closest(".badge")).toHaveClass(
      "protocol-badge-issue",
    );
  });
});
