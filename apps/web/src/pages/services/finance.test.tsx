import { render, screen } from "@testing-library/react";
import { Finance } from "./finance";
import { catalogFixture, serviceFixture } from "./test-fixtures";

it("displays agreed revenue consistently with the calculated result", () => {
  const service = {
    ...serviceFixture,
    agreedRevenue: "100.00",
    costs: {
      ...serviceFixture.costs,
      agreedRevenue: "100.00",
      planned: { cost: "20.00", revenue: "80.00", result: "80.00" },
    },
  };
  render(
    <Finance
      service={service}
      catalog={catalogFixture}
      locked={false}
      save={async () => undefined}
    />,
  );
  expect(screen.getByText("Planerlös").nextElementSibling).toHaveTextContent(
    "100,00",
  );
  expect(screen.getByText("Planergebnis").nextElementSibling).toHaveTextContent(
    "80,00",
  );
});
