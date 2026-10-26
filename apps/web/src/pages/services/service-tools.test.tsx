import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
import { Finance } from "./finance";
import { Preparation } from "./preparation";
import { AssessmentResult } from "./assessment";
import { Need } from "./need";
import { catalogFixture, serviceFixture } from "./test-fixtures";
import type { Calculation } from "./types";
const calculation: Calculation = {
  id: "calc-1",
  serviceId: serviceFixture.id,
  method: "MAURER",
  methodVersion: "Maurer 2010",
  sourceUrl: "https://www.vfdb.de/quelle.pdf",
  input: {},
  reason: "Besucher bestätigt",
  createdBy: "u",
  createdAt: "2026-10-26T10:00:00Z",
  result: {
    method: "MAURER",
    methodVersion: "Maurer 2010",
    sourceUrls: ["https://www.vfdb.de/quelle.pdf"],
    status: "COMPLETE",
    missingFields: [],
    warnings: ["MAURER_DOES_NOT_MODEL_GEOGRAPHY_OR_WEATHER"],
    requiresProfessionalReview: true,
    metrics: {},
    steps: [{ key: "score", value: 4, formula: "2 + 2" }],
    recommendation: {
      helpers: 3,
      ktw: 1,
      rtw: 0,
      emergencyDoctors: 0,
      command: "NONE",
      additionalCrewRequired: true,
    },
  },
};
const props = {
  service: serviceFixture,
  catalog: catalogFixture,
  locked: false,
  save: vi.fn(async () => undefined),
};
const renderQueries = (node: React.ReactNode) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      {node}
    </QueryClientProvider>,
  );
afterEach(() => vi.clearAllMocks());
it("keeps financial editing out of the main view and preserves rates in the table", async () => {
  render(
    <Finance
      {...props}
      service={{
        ...serviceFixture,
        lines: [
          {
            id: "l",
            label: "Sanität",
            category: "PERSONNEL",
            unit: "h",
            tariffId: null,
            plannedQuantity: "2",
            actualQuantity: null,
            costRate: "0.3355",
            saleRate: "0.1255",
          },
        ],
      }}
    />,
  );
  expect(screen.queryByRole("form")).not.toBeInTheDocument();
  expect(screen.getByText(/0,3355/)).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Preis vereinbaren" }));
  await waitFor(() =>
    expect(
      screen.getByRole("dialog", { name: "Preis vereinbaren" }),
    ).toBeVisible(),
  );
  expect(screen.getByLabelText("Vereinbarter Erlös (EUR)")).toHaveValue("");
});
it("puts calculation review behind one disclosure without hiding its findings", () => {
  render(<AssessmentResult calculation={calculation} />);
  expect(screen.getByText("Helfer").nextElementSibling).toHaveTextContent("3");
  expect(screen.getByText("1 Prüfpunkt")).toBeVisible();
  const details = screen
    .getByText("Bewertung und Rechenweg")
    .closest("details")!;
  expect(details).not.toHaveAttribute("open");
  expect(
    within(details).getByText(
      "Maurer bildet Wetter und räumliche Abdeckung nicht ab.",
    ),
  ).not.toBeVisible();
  fireEvent.click(screen.getByText("Bewertung und Rechenweg"));
  expect(
    within(details).getByRole("link", { name: "Originalquelle 1" }),
  ).toBeVisible();
});
it("shows the selected method's current result and folds older calculations", () => {
  renderQueries(
    <Need
      {...props}
      service={{
        ...serviceFixture,
        calculations: [
          calculation,
          {
            ...calculation,
            id: "old",
            reason: "Alter Stand",
            createdAt: "2026-10-25T10:00:00Z",
          },
        ],
      }}
    />,
  );
  expect(screen.getByRole("heading", { name: "Personalbedarf" })).toBeVisible();
  const history = screen
    .getByText("Frühere Berechnungen (1)")
    .closest("details")!;
  expect(history).not.toHaveAttribute("open");
  expect(screen.getByText("Alter Stand")).not.toBeVisible();
});
it("opens document upload only when requested", async () => {
  renderQueries(<Preparation {...props} />);
  expect(screen.queryByLabelText(/Datei \(PDF/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Unterlage hochladen" }));
  await waitFor(() =>
    expect(
      screen.getByRole("dialog", { name: "Unterlage hochladen" }),
    ).toBeVisible(),
  );
  expect(screen.getByLabelText(/Datei \(PDF/)).toBeVisible();
});

it("opens calculator inputs on demand and keeps the normal result view compact", async () => {
  renderQueries(<Need {...props} />);
  expect(screen.queryByRole("form")).not.toBeInTheDocument();
  expect(screen.getByText("Noch keine Berechnung.")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Berechnen" }));
  await waitFor(() =>
    expect(
      screen.getByRole("dialog", { name: "Maurer berechnen" }),
    ).toBeVisible(),
  );
  expect(screen.getByLabelText("Maximal zulässige Besucherzahl")).toHaveValue(
    null,
  );
});
