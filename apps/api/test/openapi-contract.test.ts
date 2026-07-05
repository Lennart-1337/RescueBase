import { rescueBaseOpenApiDocument } from "../src/openapi/document";

describe("RescueBase OpenAPI contract", () => {
  it("defines JSON schemas for generated frontend types", () => {
    expect(
      Object.keys(rescueBaseOpenApiDocument.components?.schemas ?? {}),
    ).toEqual(
      expect.arrayContaining([
        "Article",
        "CreateArticleRequest",
        "ReorderArticlesRequest",
        "CreateLocationRequest",
        "CreateTemplateRequest",
        "CreateBatchRequest",
        "CreateKitRequest",
        "UpdateArticleRequest",
        "UpdateLocationRequest",
        "ReviseTemplateRequest",
        "UpdateKitRequest",
        "BatchCorrectionRequest",
        "InventoryMovement",
        "InventoryTarget",
        "InventoryProcurementOrder",
        "ReceiveProcurementOrderRequest",
        "InventoryAutomationConfig",
        "AdminSettings",
        "NotificationTemplate",
        "NotificationTemplatePreview",
        "CompleteCheckRequest",
        "FulfillOrderRequest",
        "ReplenishmentOrder",
      ]),
    );
  });

  it("exposes complete admin master-data write operations", () => {
    expect(
      rescueBaseOpenApiDocument.paths["/catalog/locations"]?.post,
    ).toMatchObject({
      operationId: "CatalogController_createLocation",
      requestBody: expect.any(Object),
    });
    expect(
      rescueBaseOpenApiDocument.paths["/catalog/templates"]?.post,
    ).toMatchObject({
      operationId: "CatalogController_createTemplate",
      requestBody: expect.any(Object),
    });
    expect(
      rescueBaseOpenApiDocument.paths["/catalog/articles/{id}"]?.patch,
    ).toMatchObject({
      operationId: "CatalogController_updateArticle",
      requestBody: expect.any(Object),
    });
    expect(
      rescueBaseOpenApiDocument.paths["/catalog/articles/reorder"]?.post,
    ).toMatchObject({
      operationId: "CatalogController_reorderArticles",
      requestBody: expect.any(Object),
    });
    expect(
      rescueBaseOpenApiDocument.paths["/catalog/locations/{id}"]?.patch,
    ).toMatchObject({
      operationId: "CatalogController_updateLocation",
      requestBody: expect.any(Object),
    });
    expect(
      rescueBaseOpenApiDocument.paths["/catalog/templates/{id}/revise"]?.post,
    ).toMatchObject({
      operationId: "CatalogController_reviseTemplate",
      requestBody: expect.any(Object),
    });
    expect(
      rescueBaseOpenApiDocument.paths["/catalog/kits/{id}"]?.patch,
    ).toMatchObject({
      operationId: "CatalogController_updateKit",
      requestBody: expect.any(Object),
    });
    expect(
      rescueBaseOpenApiDocument.paths["/catalog/devices/{id}"]?.delete,
    ).toMatchObject({
      operationId: "MedicalDevicesController_delete",
      responses: expect.any(Object),
    });
  });

  it("describes public QR check, replenishment fulfillment, and batch correction request bodies", () => {
    expect(
      rescueBaseOpenApiDocument.paths["/public/kits/{token}/checks"]?.post,
    ).toMatchObject({
      operationId: "PublicChecksController_completeCheck",
      requestBody: expect.any(Object),
    });
    expect(
      rescueBaseOpenApiDocument.paths["/replenishment-orders/{id}/fulfill"]
        ?.post,
    ).toMatchObject({
      operationId: "ReplenishmentController_fulfill",
      requestBody: expect.any(Object),
    });
    expect(
      rescueBaseOpenApiDocument.paths["/inventory/batches/{id}/corrections"]
        ?.post,
    ).toMatchObject({
      operationId: "InventoryController_correctBatch",
      requestBody: expect.any(Object),
    });
    expect(
      rescueBaseOpenApiDocument.paths["/inventory/batches/{id}/movements"]?.get,
    ).toMatchObject({
      operationId: "InventoryController_movements",
    });
  });

  it("describes inventory target and procurement workflows", () => {
    expect(
      rescueBaseOpenApiDocument.paths["/inventory/targets"]?.get,
    ).toMatchObject({
      operationId: "InventoryController_targets",
    });
    expect(
      rescueBaseOpenApiDocument.paths[
        "/inventory/targets/{articleId}/{locationId}"
      ]?.put,
    ).toMatchObject({
      operationId: "InventoryController_upsertTarget",
      requestBody: expect.any(Object),
    });
    expect(
      rescueBaseOpenApiDocument.paths["/inventory/targets/reconcile"]?.post,
    ).toMatchObject({
      operationId: "InventoryController_reconcileTargets",
    });
    expect(
      rescueBaseOpenApiDocument.paths[
        "/inventory/procurement-orders/{id}/receive"
      ]?.post,
    ).toMatchObject({
      operationId: "InventoryController_receiveProcurementOrder",
      requestBody: expect.any(Object),
    });
    expect(
      rescueBaseOpenApiDocument.paths["/inventory/automation-config"]?.post,
    ).toMatchObject({
      operationId: "InventoryController_updateAutomationConfig",
      requestBody: expect.any(Object),
    });
  });

  it("describes invitation, password reset, and both 2FA enrollment flows", () => {
    expect(
      rescueBaseOpenApiDocument.paths["/auth/invitations/accept"]?.post,
    ).toMatchObject({
      operationId: "AuthController_acceptInvitation",
      requestBody: expect.any(Object),
    });
    expect(
      rescueBaseOpenApiDocument.paths["/auth/password-reset/confirm"]?.post,
    ).toMatchObject({
      operationId: "AuthController_confirmPasswordReset",
      requestBody: expect.any(Object),
    });
    expect(
      rescueBaseOpenApiDocument.paths["/auth/2fa/totp/enable"]?.post,
    ).toMatchObject({
      operationId: "AuthController_enableTotp",
      requestBody: expect.any(Object),
    });
    expect(
      rescueBaseOpenApiDocument.paths["/auth/2fa/email/enable"]?.post,
    ).toMatchObject({
      operationId: "AuthController_enableEmailTwoFactor",
      requestBody: expect.any(Object),
    });
    expect(
      rescueBaseOpenApiDocument.paths["/auth/preferences/order-notifications"]
        ?.post,
    ).toMatchObject({
      operationId: "AuthController_updateOrderNotifications",
      requestBody: expect.any(Object),
    });
    expect(
      rescueBaseOpenApiDocument.paths["/admin/settings"]?.get,
    ).toBeDefined();
    expect(
      rescueBaseOpenApiDocument.paths["/admin/settings/templates/{key}/preview"]
        ?.post,
    ).toMatchObject({
      requestBody: {
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/UpdateNotificationTemplateRequest",
            },
          },
        },
      },
      responses: {
        "201": {
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/NotificationTemplatePreview",
              },
            },
          },
        },
      },
    });
  });

  it("includes MPDG and STK/MTK metadata on articles", () => {
    expect(
      rescueBaseOpenApiDocument.components?.schemas?.Article,
    ).toMatchObject({
      properties: expect.objectContaining({
        unitsPerPackage: expect.any(Object),
        medicalDevice: expect.any(Object),
        stkRequired: expect.any(Object),
        stkIntervalMonths: expect.any(Object),
        mtkRequired: expect.any(Object),
        mtkIntervalMonths: expect.any(Object),
      }),
    });
  });

  it("describes QR reports with selectable print format", () => {
    expect(
      rescueBaseOpenApiDocument.paths["/reports/qr-label/{kitId}.pdf"]?.get,
    ).toMatchObject({
      operationId: "ReportsController_qrLabel",
      parameters: expect.arrayContaining([
        expect.objectContaining({ name: "format", in: "query" }),
      ]),
    });
  });

  it("describes the procurement PDF report filters", () => {
    expect(
      rescueBaseOpenApiDocument.paths["/reports/procurement.pdf"]?.get,
    ).toMatchObject({
      operationId: "ReportsController_procurement",
      parameters: expect.arrayContaining([
        expect.objectContaining({ name: "articleId", in: "query" }),
        expect.objectContaining({ name: "locationId", in: "query" }),
        expect.objectContaining({ name: "q", in: "query" }),
      ]),
    });
  });
});
