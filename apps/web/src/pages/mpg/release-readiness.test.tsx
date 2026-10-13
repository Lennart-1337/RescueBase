import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ReleaseReadiness, releaseBlockers } from "./release-readiness";
import type { Device } from "./types";

const ready = {
  id: "device", name: "AED", version: 1, locationId: "location", status: "DRAFT", reasons: ["Dokumentierte Freigabe fehlt."],
  inventoryNumber: "INV-1", serialNumber: "SN-1", acquisitionYear: 2026, commissionedAt: "2026-01-01",
  mpgModelId: "model", mpgModel: { id: "model", name: "Modell", manufacturer: "A", manufacturerAddress: "B", productType: "AED", version: 1,
    instructionsDocumentId: "document", requirementsReviewedAt: "2026-01-01", requirements: [] },
  inspections: [], glucoseControls: [], incidents: [], assignments: []
} as Device;

describe("guided device release", () => {
  it("allows finishing only when model review and device evidence are complete", () => {
    expect(releaseBlockers(ready)).toEqual([]);
    const missing = { ...ready, inventoryNumber: undefined, mpgModel: { ...ready.mpgModel!, requirementsReviewedAt: undefined }, reasons: ["Pflichtprüfung STK ist überfällig."] };
    expect(releaseBlockers(missing)).toEqual(expect.arrayContaining(["Inventarnummer fehlt.", "Modellanforderungen sind noch nicht geprüft.", "Pflichtprüfung STK ist überfällig."]));
  });
  it("shows every blocker and disables completion", () => {
    render(<ReleaseReadiness device={{ ...ready, commissionedAt: undefined }} onRelease={async () => undefined} />);
    expect(screen.getByText("Inbetriebnahme fehlt.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gerät freigeben" })).toBeDisabled();
  });
  it("shows a server-side validation conflict without losing the checklist", async () => {
    render(<ReleaseReadiness device={ready} onRelease={async () => { throw new Error("Gerät wurde zwischenzeitlich geändert."); }} />);
    fireEvent.click(screen.getByRole("button", { name: "Gerät freigeben" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Gerät wurde zwischenzeitlich geändert."));
  });
});
