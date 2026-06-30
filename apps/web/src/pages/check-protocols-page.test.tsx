import { screen, waitFor, within } from "@testing-library/react";
import {
  changeValue,
  clickElement,
  getActiveRouter,
  renderAppAt,
  resetTestBrowser,
  stubFetch,
} from "../test-support/app-test-helpers";

const protocol = {
  id: "check-1",
  checkerName: "Mara Müller",
  effectiveStatus: "CONDITIONAL",
  selectedStatus: "CONDITIONAL",
  createdAt: "2026-06-18T10:30:00.000Z",
  warnings: ["Eine Position fehlt."],
  positionCount: 2,
  deviationCount: 1,
  signatureHash: "abc123",
  kit: { id: "kit-1", name: "Rucksack 1", code: "RS-1" },
  replenishmentOrder: { id: "order-1", status: "OPEN" },
};

describe("CheckProtocolsPage", () => {
  afterEach(resetTestBrowser);

  it("filters protocols from the URL and opens all recorded details", async () => {
    stubFetch({
      "/api/auth/setup/status": {
        initialized: true,
      },
      "/api/auth/session": {
        user: {
          id: "user-admin",
          email: "admin@rescuebase.local",
          displayName: "Admin",
          role: "ADMIN",
          twoFactorEnabled: false,
        },
      },
      "/api/catalog/kits": [
        {
          id: "kit-1",
          name: "Rucksack 1",
          code: "RS-1",
          status: "CONDITIONAL",
          locationId: "loc-1",
          templateId: "tpl-1",
          publicToken: "token",
          tokenRotatedAt: "2026-01-01",
          location: { id: "loc-1", name: "Lager" },
          template: { id: "tpl-1", name: "Vorlage", version: 1, positions: [] },
        },
      ],
      "/api/checks?q=Mara&status=CONDITIONAL&page=1": {
        items: [protocol],
        page: 1,
        pageSize: 25,
        totalCount: 2,
        total: 1,
      },
      "/api/checks?status=CONDITIONAL&page=1": {
        items: [protocol],
        page: 1,
        pageSize: 25,
        totalCount: 2,
        total: 1,
      },
      "/api/checks/check-1": {
        ...protocol,
        signaturePngDataUrl: "data:image/png;base64,abc",
        positions: [
          {
            id: "position-1",
            articleId: "article-1",
            articleName: "Kompresse",
            moduleName: "Wundversorgung",
            unit: "Stück",
            requiredQuantity: 5,
            countedQuantity: 4,
            discardedExpiredQuantity: 1,
            missingQuantity: 1,
            surplusQuantity: 0,
            critical: true,
            note: "Packung beschädigt",
          },
        ],
      },
    });

    await renderAppAt("/admin/check-protocols?q=Mara&status=CONDITIONAL");
    await screen.findByRole("heading", { name: "Check-Protokolle" });
    const protocolRow = screen.getByText("Rucksack 1").closest(".protocol-row");
    expect(protocolRow).not.toBeNull();
    expect(within(protocolRow as HTMLElement).getByText("18.06.2026, 12:30").closest(".protocol-row-timestamp")).not.toBeNull();
    const metrics = within(protocolRow as HTMLElement).getByText("1 Abweichungen").closest(".protocol-row-metrics");
    const actions = within(protocolRow as HTMLElement).getByRole("button", { name: "Details anzeigen" }).closest(".protocol-row-actions");
    expect(metrics).not.toBeNull();
    expect(actions).not.toBeNull();
    expect(
      screen.getByRole("heading", { name: "Statusbild" }),
    ).toBeInTheDocument();
    expect(screen.getByText("1/2 sichtbar")).toBeInTheDocument();
    expect(screen.getByLabelText("Suche")).toHaveValue("Mara");
    expect(screen.getByLabelText("Status")).toHaveValue("Bedingt einsatzbereit");
    await clickElement(
      screen.getByRole("button", { name: "Details anzeigen" }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Check-Protokoll",
    });
    expect(
      within(dialog).queryByText(
        "Vollständige Dokumentation des abgeschlossenen Rucksackchecks.",
      ),
    ).toBeNull();
    expect(within(dialog).getByText("Kompresse")).toBeInTheDocument();
    expect(
      within(dialog).getByRole("heading", { name: "Signatur" }),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Hashwert")).toBeInTheDocument();
    expect(
      within(dialog).getByText("Wundversorgung · Packung beschädigt"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByAltText("Unterschrift von Mara Müller"),
    ).toBeInTheDocument();
    await changeValue(screen.getByLabelText("Suche"), "");
    await waitFor(() =>
      expect(getActiveRouter()?.state.location.search).toMatchObject({
        status: "CONDITIONAL",
      }),
    );
  });
});
