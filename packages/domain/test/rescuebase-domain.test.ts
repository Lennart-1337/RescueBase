import {
  applyFulfillment,
  deriveKitStatusFromEvaluation,
  evaluateCheck,
  type CheckCompletionInput,
  type ReplenishmentOrderState,
  type TemplatePosition
} from "../src/index.js";

const positions: TemplatePosition[] = [
  {
    id: "pos-bandage",
    articleId: "article-bandage",
    articleName: "Verbandpäckchen",
    moduleName: "Verband",
    requiredQuantity: 6,
    unit: "Stück",
    critical: false
  },
  {
    id: "pos-tourniquet",
    articleId: "article-tourniquet",
    articleName: "Tourniquet",
    moduleName: "Blutung",
    requiredQuantity: 2,
    unit: "Stück",
    critical: true
  }
];

function checkInput(overrides: Partial<CheckCompletionInput> = {}): CheckCompletionInput {
  return {
    kitId: "kit-1",
    checkerName: "Mara Müller",
    selectedStatus: "CONDITIONAL",
    signaturePngDataUrl: "data:image/png;base64,abc",
    positions: [
      {
        templatePositionId: "pos-bandage",
        countedQuantity: 4,
        discardedExpiredQuantity: 1
      },
      {
        templatePositionId: "pos-tourniquet",
        countedQuantity: 2,
        discardedExpiredQuantity: 0
      }
    ],
    ...overrides
  };
}

describe("RescueBase domain rules", () => {
  it("creates replenishment draft items from shortages and discarded expired material", () => {
    const evaluation = evaluateCheck(positions, checkInput());

    expect(evaluation.positions[0]).toMatchObject({
      missingQuantity: 2,
      discardedExpiredQuantity: 1,
      needsReplenishment: true
    });
    expect(evaluation.replenishmentItems).toEqual([
      expect.objectContaining({
        articleId: "article-bandage",
        neededQuantity: 3,
        reason: "SHORTAGE_AND_DISCARDED_EXPIRED"
      })
    ]);
  });

  it("warns when a checker marks a kit ready despite shortages", () => {
    const evaluation = evaluateCheck(
      positions,
      checkInput({
        selectedStatus: "READY",
        statusReason: ""
      })
    );

    expect(evaluation.requiresReason).toBe(true);
    expect(evaluation.warnings).toContain("Fehlmengen sprechen gegen den Status bereit.");
    expect(evaluation.warnings).toContain("Status bereit trotz Abweichung benötigt eine Begründung.");
  });

  it("derives not ready from critical shortages", () => {
    const evaluation = evaluateCheck(
      positions,
      checkInput({
        positions: [
          { templatePositionId: "pos-bandage", countedQuantity: 6, discardedExpiredQuantity: 0 },
          { templatePositionId: "pos-tourniquet", countedQuantity: 1, discardedExpiredQuantity: 0 }
        ]
      })
    );

    expect(deriveKitStatusFromEvaluation(evaluation)).toBe("NOT_READY");
  });

  it("allows partial replenishment and keeps the order in progress", () => {
    const order: ReplenishmentOrderState = {
      id: "order-1",
      status: "OPEN",
      items: [
        {
          articleId: "article-bandage",
          articleName: "Verbandpäckchen",
          templatePositionId: "pos-bandage",
          neededQuantity: 3,
          requestedQuantity: 3,
          fulfilledQuantity: 0,
          reason: "SHORTAGE_AND_DISCARDED_EXPIRED",
          unit: "Stück",
          critical: false
        }
      ]
    };

    const result = applyFulfillment(order, [{ itemId: "pos-bandage", quantity: 2 }]);

    expect(result.completed).toBe(false);
    expect(result.remainingQuantity).toBe(1);
    expect(result.order.status).toBe("IN_PROGRESS");
    expect(result.order.items[0]?.fulfilledQuantity).toBe(2);
  });
});
