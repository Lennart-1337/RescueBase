import { calculateServiceCosts } from "../src/services/costs.js";
const line = {
  plannedQuantity: "1.25",
  actualQuantity: "2",
  costRate: "19.99",
  saleRate: "25",
};
describe("exact planned and actual service costs", () => {
  test("an empty calculation does not assert that actual costs are zero", () => {
    expect(calculateServiceCosts([], null).actual).toMatchObject({
      complete: false,
      cost: null,
      revenue: null,
      result: null,
    });
    expect(
      calculateServiceCosts([{ ...line, actualQuantity: "0" }], null).actual,
    ).toMatchObject({ complete: true, cost: "0.00" });
  });
  test("rounds each position commercially and retains exact decimal strings", () => {
    expect(calculateServiceCosts([line], null)).toEqual({
      currency: "EUR",
      agreedRevenue: null,
      planned: { cost: "24.99", revenue: "31.25", result: "6.26" },
      actual: {
        complete: true,
        cost: "39.98",
        revenue: "50.00",
        knownCost: "39.98",
        knownRevenue: "50.00",
        result: "10.02",
      },
    });
  });
  test("agreed revenue overrides calculated revenue only for results", () => {
    const result = calculateServiceCosts([line], "10");
    expect(result.planned).toEqual({
      cost: "24.99",
      revenue: "31.25",
      result: "-14.99",
    });
    expect(result.actual.result).toBe("-29.98");
  });
  test("unknown actual quantities cannot imply complete actual figures", () => {
    const result = calculateServiceCosts(
      [line, { ...line, actualQuantity: null }],
      null,
    );
    expect(result.actual).toEqual({
      complete: false,
      cost: null,
      revenue: null,
      result: null,
      knownCost: "39.98",
      knownRevenue: "50.00",
    });
  });
  test("rounds exact half cents up and does not sum binary floats", () => {
    expect(
      calculateServiceCosts(
        [{ ...line, plannedQuantity: "0.5", costRate: "0.01" }],
        null,
      ).planned.cost,
    ).toBe("0.01");
    expect(
      calculateServiceCosts(
        [
          {
            ...line,
            plannedQuantity: "9999999999.9999",
            costRate: "9999999999.9999",
          },
        ],
        null,
      ).planned.cost,
    ).toBe("99999999999998000000.00");
  });
  test("rejects negative, invalid, exponent and excessive-precision decimals", () => {
    for (const costRate of [
      "-1",
      "NaN",
      "Infinity",
      "1e2",
      "1.12345",
      "10000000000",
    ]) {
      expect(() =>
        calculateServiceCosts([{ ...line, costRate }], null),
      ).toThrow();
    }
  });
});
