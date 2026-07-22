import type { OpenAPIObject } from "@nestjs/swagger";

type OpenApiFragment = Record<string, unknown>;

const json = "application/json";
const pdf = "application/pdf";

const rescueBaseOpenApiDocumentDefinition = {
  openapi: "3.0.0",
  info: {
    title: "RescueBase API",
    description:
      "API for Sanitätslager, Rucksackchecks, Chargen and Nachfüllaufträge.",
    version: "0.1.0",
  },
  servers: [{ url: "/api", description: "Reverse-proxied API base path" }],
  tags: [
    { name: "Auth" },
    { name: "Stammdaten" },
    { name: "Lager" },
    { name: "Bestellungen" },
    { name: "Öffentliche Checks" },
    { name: "Check-Protokolle" },
    { name: "Nachfüllaufträge" },
    { name: "Reports" },
    { name: "Audit" },
    { name: "Admin-Einstellungen" },
    { name: "Push" },
  ],
  components: {
    securitySchemes: {
      sessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: "rb_session",
      },
    },
    schemas: {
      UserRole: stringEnum(["ADMIN", "WAREHOUSE"]),
      TwoFactorMethod: stringEnum(["TOTP", "EMAIL"]),
      KitOperationalStatus: stringEnum(["READY", "CONDITIONAL", "NOT_READY"]),
      ReplenishmentStatus: stringEnum(["OPEN", "DONE", "CANCELLED"]),
      InventoryProcurementStatus: stringEnum([
        "OPEN",
        "IN_PROGRESS",
        "DONE",
        "CANCELLED",
      ]),
      PurchaseOrderStatus: stringEnum([
        "DRAFT",
        "APPROVED",
        "ORDERED",
        "PARTIALLY_RECEIVED",
        "RECEIVED",
      ]),
      ReplenishmentReason: stringEnum([
        "SHORTAGE",
        "DISCARDED_EXPIRED",
        "SHORTAGE_AND_DISCARDED_EXPIRED",
      ]),
      AppBranding: objectSchema(
        {
          appName: { type: "string", example: "RescueBase" },
          appSubtitle: { type: "string", example: "Sanitätslager" },
          showLogo: { type: "boolean", example: true },
          showAppName: { type: "boolean", example: false },
          showAppSubtitle: { type: "boolean", example: true },
        },
        [
          "appName",
          "appSubtitle",
          "showLogo",
          "showAppName",
          "showAppSubtitle",
        ],
      ),
      SetupStatus: objectSchema(
        {
          initialized: { type: "boolean" },
          appName: { type: "string", example: "RescueBase" },
          appSubtitle: { type: "string", example: "Sanitätslager" },
          showLogo: { type: "boolean", example: true },
          showAppName: { type: "boolean", example: false },
          showAppSubtitle: { type: "boolean", example: true },
        },
        [
          "initialized",
          "appName",
          "appSubtitle",
          "showLogo",
          "showAppName",
          "showAppSubtitle",
        ],
      ),
      AuthenticatedUser: objectSchema(
        {
          id: { type: "string" },
          email: { type: "string", format: "email" },
          displayName: { type: "string" },
          role: ref("UserRole"),
          twoFactorEnabled: { type: "boolean" },
          twoFactorMethod: ref("TwoFactorMethod"),
          newOrderNotificationsEnabled: { type: "boolean" },
        },
        [
          "id",
          "email",
          "displayName",
          "role",
          "twoFactorEnabled",
          "newOrderNotificationsEnabled",
        ],
      ),
      SessionResponse: objectSchema(
        {
          user: ref("AuthenticatedUser"),
          appName: { type: "string", example: "RescueBase" },
          appSubtitle: { type: "string", example: "Sanitätslager" },
          showLogo: { type: "boolean", example: true },
          showAppName: { type: "boolean", example: false },
          showAppSubtitle: { type: "boolean", example: true },
        },
        [
          "user",
          "appName",
          "appSubtitle",
          "showLogo",
          "showAppName",
          "showAppSubtitle",
        ],
      ),
      FirstAdminRequest: objectSchema(
        {
          email: { type: "string", format: "email" },
          displayName: { type: "string" },
          password: { type: "string", minLength: 12 },
        },
        ["email", "displayName", "password"],
      ),
      FirstAdminResponse: objectSchema(
        {
          ok: { type: "boolean", enum: [true] },
          userId: { type: "string" },
          user: ref("AuthenticatedUser"),
        },
        ["ok", "userId", "user"],
      ),
      LoginRequest: objectSchema({
        email: { type: "string", format: "email" },
        password: { type: "string" },
        twoFactorCode: { type: "string" },
        emailChallengeId: { type: "string" },
        loginChallengeId: { type: "string" },
      }),
      LoginResponse: objectSchema(
        {
          requiresTwoFactor: { type: "boolean" },
          twoFactorMethod: ref("TwoFactorMethod"),
          loginChallengeId: { type: "string" },
          emailChallengeId: { type: "string" },
          user: ref("AuthenticatedUser"),
        },
        ["requiresTwoFactor"],
      ),
      TotpSetupResponse: objectSchema(
        {
          secret: { type: "string" },
          otpauthUrl: { type: "string" },
        },
        ["secret", "otpauthUrl"],
      ),
      CurrentPasswordRequest: objectSchema(
        { currentPassword: { type: "string", minLength: 1 } },
        ["currentPassword"],
      ),
      EnableTotpRequest: objectSchema(
        {
          code: { type: "string" },
        },
        ["code"],
      ),
      EmailTwoFactorStartResponse: objectSchema(
        {
          challengeId: { type: "string" },
        },
        ["challengeId"],
      ),
      EnableEmailTwoFactorRequest: objectSchema(
        {
          challengeId: { type: "string" },
          code: { type: "string" },
        },
        ["challengeId", "code"],
      ),
      UpdateOrderNotificationsRequest: objectSchema(
        {
          enabled: { type: "boolean" },
        },
        ["enabled"],
      ),
      UpdateOrderNotificationsResponse: objectSchema(
        {
          ok: { type: "boolean", enum: [true] },
          user: ref("AuthenticatedUser"),
        },
        ["ok", "user"],
      ),
      PushConfiguration: objectSchema({
        enabled: { type: "boolean" },
        publicKey: { type: "string" },
      }, ["enabled"]),
      PushSubscriptionRequest: objectSchema({
        endpoint: { type: "string", format: "uri" },
        expirationTime: { type: "number", nullable: true },
        keys: objectSchema({ auth: { type: "string" }, p256dh: { type: "string" } }, ["auth", "p256dh"]),
      }, ["endpoint", "keys"]),
      PushSubscriptionEndpoints: objectSchema({
        endpoints: { type: "array", items: { type: "string", format: "uri" } },
      }, ["endpoints"]),
      PushSubscriptionRemovalRequest: objectSchema({ endpoint: { type: "string", format: "uri" } }, ["endpoint"]),
      InviteUserRequest: objectSchema(
        {
          email: { type: "string", format: "email" },
          displayName: { type: "string" },
          role: ref("UserRole"),
        },
        ["email", "displayName", "role"],
      ),
      InviteUserResponse: objectSchema(
        {
          id: { type: "string" },
          invitationUrl: { type: "string", format: "uri" },
        },
        ["id", "invitationUrl"],
      ),
      UpdateUserProfileRequest: objectSchema(
        { email: { type: "string", format: "email" }, displayName: { type: "string" } },
        ["email", "displayName"],
      ),
      UpdateUserProfileResponse: objectSchema(
        { ok: { type: "boolean", enum: [true] }, emailChangeRequested: { type: "boolean" } },
        ["ok", "emailChangeRequested"],
      ),
      EmailChangePreview: objectSchema(
        { email: { type: "string", format: "email" } },
        ["email"],
      ),
      InvitationPreview: objectSchema(
        {
          email: { type: "string", format: "email" },
          displayName: { type: "string" },
          role: ref("UserRole"),
        },
        ["email", "displayName", "role"],
      ),
      AcceptInvitationRequest: objectSchema(
        {
          token: { type: "string" },
          password: { type: "string", minLength: 12 },
          displayName: { type: "string" },
        },
        ["token", "password"],
      ),
      AcceptInvitationResponse: objectSchema(
        {
          ok: { type: "boolean", enum: [true] },
          user: ref("AuthenticatedUser"),
        },
        ["ok", "user"],
      ),
      PasswordResetRequest: objectSchema(
        {
          email: { type: "string", format: "email" },
        },
        ["email"],
      ),
      PasswordResetRequestResponse: objectSchema(
        {
          ok: { type: "boolean", enum: [true] },
        },
        ["ok"],
      ),
      PasswordResetPreview: objectSchema(
        {
          email: { type: "string", format: "email" },
          displayName: { type: "string" },
        },
        ["email", "displayName"],
      ),
      PasswordResetConfirmRequest: objectSchema(
        {
          token: { type: "string" },
          password: { type: "string", minLength: 12 },
        },
        ["token", "password"],
      ),
      UserSummary: objectSchema(
        {
          id: { type: "string" },
          email: { type: "string", format: "email" },
          displayName: { type: "string" },
          role: ref("UserRole"),
          active: { type: "boolean" },
          twoFactorEnabled: { type: "boolean" },
          twoFactorMethod: ref("TwoFactorMethod"),
          sessionCount: { type: "integer", minimum: 0 },
          invitationStatus: stringEnum(["OPEN", "EXPIRED", "ACCEPTED", "REVOKED"]),
          pendingEmail: { type: "string", format: "email" },
        },
        ["id", "email", "displayName", "role", "active", "twoFactorEnabled", "sessionCount"],
      ),
      SetUserActiveRequest: objectSchema(
        {
          active: { type: "boolean" },
        },
        ["active"],
      ),
      SetUserRoleRequest: objectSchema(
        {
          role: ref("UserRole"),
        },
        ["role"],
      ),
      Supplier: objectSchema(
        {
          id: { type: "string" },
          name: { type: "string" },
          contactPerson: { type: "string" },
          email: { type: "string", format: "email" },
          phone: { type: "string" },
          website: { type: "string", format: "uri" },
          street: { type: "string" },
          postalCode: { type: "string" },
          city: { type: "string" },
          country: { type: "string" },
          notes: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
        ["id", "name"],
      ),
      CreateSupplierRequest: objectSchema(
        {
          name: { type: "string" },
          contactPerson: { type: "string" },
          email: { type: "string", format: "email" },
          phone: { type: "string" },
          website: { type: "string", format: "uri" },
          street: { type: "string" },
          postalCode: { type: "string" },
          city: { type: "string" },
          country: { type: "string" },
          notes: { type: "string" },
        },
        ["name"],
      ),
      UpdateSupplierRequest: objectSchema(
        {
          name: { type: "string" },
          contactPerson: { type: "string" },
          email: { type: "string", format: "email" },
          phone: { type: "string" },
          website: { type: "string", format: "uri" },
          street: { type: "string" },
          postalCode: { type: "string" },
          city: { type: "string" },
          country: { type: "string" },
          notes: { type: "string" },
        },
        ["name"],
      ),
      Article: objectSchema(
        {
          id: { type: "string" },
          name: { type: "string" },
          unit: { type: "string" },
          manufacturer: { type: "string" },
          manufacturerPartNumber: { type: "string" },
          category: { type: "string" },
          barcode: { type: "string" },
          articleUrl: { type: "string", format: "uri" },
          defaultSupplierId: { type: "string" },
          defaultSupplierName: { type: "string" },
          unitsPerPackage: { type: "integer", minimum: 1 },
          defaultGrossPriceCents: { type: "integer", minimum: 0 },
          sterile: { type: "boolean" },
          medicalDevice: { type: "boolean" },
          stkRequired: { type: "boolean" },
          stkIntervalMonths: { type: "integer" },
          mtkRequired: { type: "boolean" },
          mtkIntervalMonths: { type: "integer" },
          storageNotes: { type: "string" },
          notes: { type: "string" },
          criticalDefault: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
        ["id", "name", "unit", "sterile", "criticalDefault"],
      ),
      CreateArticleRequest: objectSchema(
        {
          name: { type: "string" },
          unit: { type: "string" },
          manufacturer: { type: "string" },
          manufacturerPartNumber: { type: "string" },
          category: { type: "string" },
          barcode: { type: "string" },
          articleUrl: { type: "string", format: "uri" },
          defaultSupplierId: { type: "string" },
          unitsPerPackage: { type: "integer", minimum: 1 },
          defaultGrossPriceCents: { type: "integer", minimum: 0 },
          sterile: { type: "boolean" },
          medicalDevice: { type: "boolean" },
          stkRequired: { type: "boolean" },
          stkIntervalMonths: { type: "integer" },
          mtkRequired: { type: "boolean" },
          mtkIntervalMonths: { type: "integer" },
          storageNotes: { type: "string" },
          notes: { type: "string" },
          criticalDefault: { type: "boolean" },
        },
        ["name", "unit", "sterile", "criticalDefault"],
      ),
      UpdateArticleRequest: objectSchema(
        {
          name: { type: "string" },
          unit: { type: "string" },
          manufacturer: { type: "string" },
          manufacturerPartNumber: { type: "string" },
          category: { type: "string" },
          barcode: { type: "string" },
          articleUrl: { type: "string", format: "uri" },
          defaultSupplierId: { type: "string" },
          unitsPerPackage: { type: "integer", minimum: 1 },
          defaultGrossPriceCents: { type: "integer", minimum: 0 },
          sterile: { type: "boolean" },
          medicalDevice: { type: "boolean" },
          stkRequired: { type: "boolean" },
          stkIntervalMonths: { type: "integer" },
          mtkRequired: { type: "boolean" },
          mtkIntervalMonths: { type: "integer" },
          storageNotes: { type: "string" },
          notes: { type: "string" },
          criticalDefault: { type: "boolean" },
        },
        ["name", "unit", "sterile", "criticalDefault"],
      ),
      ReorderArticlesRequest: objectSchema(
        {
          articleIds: arrayOf({ type: "string" }),
        },
        ["articleIds"],
      ),
      Location: objectSchema(
        {
          id: { type: "string" },
          name: { type: "string" },
          kind: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
        ["id", "name", "kind"],
      ),
      CreateLocationRequest: objectSchema(
        {
          name: { type: "string" },
          kind: { type: "string" },
        },
        ["name", "kind"],
      ),
      UpdateLocationRequest: objectSchema(
        {
          name: { type: "string" },
          kind: { type: "string" },
        },
        ["name", "kind"],
      ),
      MedicalDeviceArticle: objectSchema(
        {
          id: { type: "string" },
          name: { type: "string" },
          stkRequired: { type: "boolean" },
          mtkRequired: { type: "boolean" },
          stkIntervalMonths: { type: "integer" },
          mtkIntervalMonths: { type: "integer" },
        },
        ["id", "name", "stkRequired", "mtkRequired"],
      ),
      MedicalDeviceLocation: objectSchema(
        {
          id: { type: "string" },
          name: { type: "string" },
        },
        ["id", "name"],
      ),
      MedicalDeviceKit: objectSchema(
        {
          id: { type: "string" },
          name: { type: "string" },
          code: { type: "string" },
          locationId: { type: "string" },
          locationName: { type: "string" },
        },
        ["id", "name", "code", "locationId", "locationName"],
      ),
      MedicalDevice: objectSchema(
        {
          id: { type: "string" },
          name: { type: "string" },
          articleId: { type: "string" },
          locationId: { type: "string" },
          kitId: { type: "string" },
          serialNumber: { type: "string" },
          inventoryNumber: { type: "string" },
          lastStkAt: { type: "string", format: "date-time" },
          lastMtkAt: { type: "string", format: "date-time" },
          stkIntervalMonths: { type: "integer" },
          mtkIntervalMonths: { type: "integer" },
          active: { type: "boolean" },
          notes: { type: "string" },
          article: ref("MedicalDeviceArticle"),
          location: ref("MedicalDeviceLocation"),
          kit: ref("MedicalDeviceKit"),
        },
        [
          "id",
          "name",
          "articleId",
          "locationId",
          "active",
          "article",
          "location",
        ],
      ),
      MedicalDeviceWriteRequest: objectSchema(
        {
          name: { type: "string" },
          articleId: { type: "string" },
          locationId: { type: "string" },
          kitId: { type: "string" },
          serialNumber: { type: "string" },
          inventoryNumber: { type: "string" },
          lastStkAt: { type: "string", format: "date-time" },
          lastMtkAt: { type: "string", format: "date-time" },
          stkIntervalMonths: { type: "integer" },
          mtkIntervalMonths: { type: "integer" },
          active: { type: "boolean" },
          notes: { type: "string" },
        },
        ["name", "articleId"],
      ),
      TemplatePosition: objectSchema(
        {
          id: { type: "string" },
          articleId: { type: "string" },
          articleName: { type: "string" },
          moduleName: { type: "string" },
          requiredQuantity: { type: "integer", minimum: 1 },
          unit: { type: "string" },
          critical: { type: "boolean" },
        },
        [
          "id",
          "articleId",
          "articleName",
          "requiredQuantity",
          "unit",
          "critical",
        ],
      ),
      KitTemplate: objectSchema(
        {
          id: { type: "string" },
          name: { type: "string" },
          version: { type: "integer", minimum: 1 },
          positions: arrayOf(ref("TemplatePosition")),
        },
        ["id", "name", "version", "positions"],
      ),
      CreateTemplatePositionRequest: objectSchema(
        {
          articleId: { type: "string" },
          moduleName: { type: "string" },
          requiredQuantity: { type: "integer", minimum: 1 },
          critical: { type: "boolean" },
        },
        ["articleId", "requiredQuantity", "critical"],
      ),
      CreateTemplateRequest: objectSchema(
        {
          name: { type: "string" },
          version: { type: "integer", minimum: 1 },
          positions: arrayOf(ref("CreateTemplatePositionRequest")),
        },
        ["name", "positions"],
      ),
      ReviseTemplateRequest: objectSchema(
        {
          positions: arrayOf(ref("CreateTemplatePositionRequest")),
        },
        ["positions"],
      ),
      Kit: objectSchema(
        {
          id: { type: "string" },
          name: { type: "string" },
          code: { type: "string" },
          locationId: { type: "string" },
          templateId: { type: "string" },
          status: ref("KitOperationalStatus"),
          publicToken: { type: "string" },
          tokenRotatedAt: { type: "string", format: "date-time" },
          location: objectSchema(
            { id: { type: "string" }, name: { type: "string" } },
            ["id", "name"],
          ),
          template: ref("KitTemplate"),
        },
        [
          "id",
          "name",
          "code",
          "locationId",
          "templateId",
          "status",
          "publicToken",
          "tokenRotatedAt",
        ],
      ),
      KitSummary: objectSchema(
        {
          id: { type: "string" },
          name: { type: "string" },
          code: { type: "string" },
          status: ref("KitOperationalStatus"),
          publicToken: { type: "string" },
        },
        ["id", "name", "code", "status", "publicToken"],
      ),
      CreateKitRequest: objectSchema(
        {
          name: { type: "string" },
          code: { type: "string" },
          locationId: { type: "string" },
          templateId: { type: "string" },
        },
        ["name", "code", "locationId", "templateId"],
      ),
      UpdateKitRequest: objectSchema(
        {
          name: { type: "string" },
          code: { type: "string" },
          locationId: { type: "string" },
          templateId: { type: "string" },
        },
        ["name", "code", "locationId", "templateId"],
      ),
      Batch: objectSchema(
        {
          id: { type: "string" },
          articleId: { type: "string" },
          locationId: { type: "string" },
          lotNumber: { type: "string" },
          expiresAt: { type: "string", format: "date" },
          quantity: { type: "integer", minimum: 0 },
          article: objectSchema(
            {
              id: { type: "string" },
              name: { type: "string" },
              unit: { type: "string" },
            },
            ["id", "name", "unit"],
          ),
          location: objectSchema(
            { id: { type: "string" }, name: { type: "string" } },
            ["id", "name"],
          ),
        },
        [
          "id",
          "articleId",
          "locationId",
          "lotNumber",
          "expiresAt",
          "quantity",
          "article",
          "location",
        ],
      ),
      CreateBatchRequest: objectSchema(
        {
          articleId: { type: "string" },
          locationId: { type: "string" },
          lotNumber: { type: "string" },
          expiresAt: { type: "string", format: "date" },
          quantity: { type: "integer", minimum: 0 },
        },
        ["articleId", "locationId", "lotNumber", "expiresAt", "quantity"],
      ),
      BatchCorrectionRequest: objectSchema(
        {
          reason: { type: "string" },
          quantity: { type: "integer", minimum: 0 },
          lotNumber: { type: "string" },
          expiresAt: { type: "string", format: "date" },
          locationId: { type: "string" },
        },
        ["reason"],
      ),
      InventoryMovement: objectSchema(
        {
          id: { type: "string" },
          batchId: { type: "string" },
          articleId: { type: "string" },
          locationId: { type: "string" },
          replenishmentOrderId: { type: "string" },
          inventoryProcurementOrderId: { type: "string" },
          templatePositionId: { type: "string" },
          type: { type: "string" },
          quantity: { type: "integer" },
          actorLabel: { type: "string" },
          reason: { type: "string" },
          metadata: { type: "object", additionalProperties: true },
          createdAt: { type: "string", format: "date-time" },
        },
        [
          "id",
          "batchId",
          "articleId",
          "locationId",
          "type",
          "quantity",
          "actorLabel",
          "createdAt",
        ],
      ),
      InventoryTargetArticle: objectSchema(
        {
          id: { type: "string" },
          name: { type: "string" },
          unit: { type: "string" },
          articleUrl: { type: "string", format: "uri" },
        },
        ["id", "name", "unit"],
      ),
      InventoryTargetLocation: objectSchema(
        {
          id: { type: "string" },
          name: { type: "string" },
        },
        ["id", "name"],
      ),
      InventoryProcurementReceipt: objectSchema(
        {
          id: { type: "string" },
          batchId: { type: "string" },
          quantity: { type: "integer", minimum: 1 },
          lotNumber: { type: "string" },
          expiresAt: { type: "string", format: "date" },
          verifiedAt: { type: "string", format: "date-time" },
          verifiedBy: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
        [
          "id",
          "batchId",
          "quantity",
          "lotNumber",
          "expiresAt",
          "verifiedAt",
          "verifiedBy",
          "createdAt",
        ],
      ),
      InventoryProcurementOrder: objectSchema(
        {
          id: { type: "string" },
          articleId: { type: "string" },
          locationId: { type: "string" },
          status: ref("InventoryProcurementStatus"),
          requestedQuantity: { type: "integer", minimum: 1 },
          receivedQuantity: { type: "integer", minimum: 0 },
          remainingQuantity: { type: "integer", minimum: 0 },
          articleUrlSnapshot: { type: "string", format: "uri" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          article: ref("InventoryTargetArticle"),
          location: ref("InventoryTargetLocation"),
          receipts: arrayOf(ref("InventoryProcurementReceipt")),
        },
        [
          "id",
          "articleId",
          "locationId",
          "status",
          "requestedQuantity",
          "receivedQuantity",
          "remainingQuantity",
          "createdAt",
          "updatedAt",
          "article",
          "location",
          "receipts",
        ],
      ),
      InventoryTarget: objectSchema(
        {
          id: { type: "string" },
          articleId: { type: "string" },
          locationId: { type: "string" },
          targetQuantity: { type: "integer", minimum: 1 },
          currentQuantity: { type: "integer", minimum: 0 },
          shortageQuantity: { type: "integer", minimum: 0 },
          article: ref("InventoryTargetArticle"),
          location: ref("InventoryTargetLocation"),
          procurementOrder: ref("InventoryProcurementOrder"),
        },
        [
          "id",
          "articleId",
          "locationId",
          "targetQuantity",
          "currentQuantity",
          "shortageQuantity",
          "article",
          "location",
        ],
      ),
      UpsertInventoryTargetRequest: objectSchema(
        {
          targetQuantity: { type: "integer", minimum: 1 },
        },
        ["targetQuantity"],
      ),
      InventoryReconcileResponse: objectSchema(
        {
          checked: { type: "integer", minimum: 0 },
          created: { type: "integer", minimum: 0 },
          updated: { type: "integer", minimum: 0 },
          cancelled: { type: "integer", minimum: 0 },
        },
        ["checked", "created", "updated", "cancelled"],
      ),
      ReceiveProcurementOrderItemRequest: objectSchema(
        {
          lotNumber: { type: "string" },
          expiresAt: { type: "string", format: "date" },
          quantity: { type: "integer", minimum: 1 },
        },
        ["lotNumber", "expiresAt", "quantity"],
      ),
      ReceiveProcurementOrderRequest: objectSchema(
        {
          items: arrayOf(ref("ReceiveProcurementOrderItemRequest")),
          verified: { type: "boolean" },
        },
        ["items", "verified"],
      ),
      PurchaseOrderLine: objectSchema(
        {
          id: { type: "string" },
          articleId: { type: "string" },
          articleName: { type: "string" },
          supplierArticleNumber: { type: "string" },
          articleUrl: { type: "string", format: "uri" },
          manufacturerPartNumber: { type: "string" },
          unit: { type: "string" },
          grossUnitPriceCents: { type: "integer", minimum: 0 },
          orderedQuantity: { type: "integer", minimum: 1 },
          receivedQuantity: { type: "integer", minimum: 0 },
          remainingQuantity: { type: "integer", minimum: 0 },
          lineTotalGrossCents: { type: "integer", minimum: 0 },
          note: { type: "string" },
        },
        [
          "id",
          "articleId",
          "articleName",
          "unit",
          "grossUnitPriceCents",
          "orderedQuantity",
          "receivedQuantity",
          "remainingQuantity",
          "lineTotalGrossCents",
        ],
      ),
      PurchaseOrderReceipt: objectSchema(
        {
          id: { type: "string" },
          lineId: { type: "string" },
          batchId: { type: "string" },
          quantity: { type: "integer", minimum: 1 },
          lotNumber: { type: "string" },
          expiresAt: { type: "string", format: "date" },
          receivedAt: { type: "string", format: "date-time" },
          receivedBy: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
        [
          "id",
          "lineId",
          "batchId",
          "quantity",
          "lotNumber",
          "expiresAt",
          "receivedAt",
          "receivedBy",
          "createdAt",
        ],
      ),
      PurchaseOrder: objectSchema(
        {
          id: { type: "string" },
          orderNumber: { type: "string" },
          supplierId: { type: "string" },
          supplierName: { type: "string" },
          locationId: { type: "string" },
          status: ref("PurchaseOrderStatus"),
          notes: { type: "string" },
          archivedAt: { type: "string", format: "date-time" },
          approvedAt: { type: "string", format: "date-time" },
          approvedByName: { type: "string" },
          orderedAt: { type: "string", format: "date-time" },
          receivedAt: { type: "string", format: "date-time" },
          totalGrossCents: { type: "integer", minimum: 0 },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          location: ref("InventoryTargetLocation"),
          lines: arrayOf(ref("PurchaseOrderLine")),
          receipts: arrayOf(ref("PurchaseOrderReceipt")),
        },
        [
          "id",
          "orderNumber",
          "supplierId",
          "supplierName",
          "locationId",
          "status",
          "totalGrossCents",
          "createdAt",
          "updatedAt",
          "location",
          "lines",
          "receipts",
        ],
      ),
      PurchaseOrderLineWriteRequest: objectSchema(
        {
          articleId: { type: "string" },
          orderedQuantity: { type: "integer", minimum: 1 },
          grossUnitPriceCents: { type: "integer", minimum: 0 },
          note: { type: "string" },
          supplierArticleNumber: { type: "string" },
        },
        ["articleId", "orderedQuantity"],
      ),
      PurchaseOrderWriteRequest: objectSchema(
        {
          supplierId: { type: "string" },
          locationId: { type: "string" },
          notes: { type: "string" },
          lines: arrayOf(ref("PurchaseOrderLineWriteRequest")),
        },
        ["supplierId", "locationId", "lines"],
      ),
      PurchaseOrderLineNoteRequest: objectSchema(
        {
          lineId: { type: "string" },
          note: { type: "string" },
        },
        ["lineId"],
      ),
      UpdatePurchaseOrderRequest: objectSchema({
        supplierId: { type: "string" },
        locationId: { type: "string" },
        notes: { type: "string" },
        lines: arrayOf(ref("PurchaseOrderLineWriteRequest")),
        lineNotes: arrayOf(ref("PurchaseOrderLineNoteRequest")),
      }),
      CreatePurchaseOrdersFromShortagesRequest: objectSchema(
        {
          locationId: { type: "string" },
          groupingMode: stringEnum(["single", "supplier"]),
          supplierId: { type: "string" },
          articleIds: arrayOf({ type: "string" }),
        },
        ["locationId", "groupingMode"],
      ),
      PurchaseOrderReceiptBatchRequest: objectSchema(
        {
          lotNumber: { type: "string" },
          expiresAt: { type: "string", format: "date" },
          quantity: { type: "integer", minimum: 1 },
        },
        ["lotNumber", "expiresAt", "quantity"],
      ),
      PurchaseOrderReceiveLineRequest: objectSchema(
        {
          lineId: { type: "string" },
          batches: arrayOf(ref("PurchaseOrderReceiptBatchRequest")),
        },
        ["lineId", "batches"],
      ),
      ReceivePurchaseOrderRequest: objectSchema(
        {
          lines: arrayOf(ref("PurchaseOrderReceiveLineRequest")),
        },
        ["lines"],
      ),
      InventoryAutomationConfig: objectSchema(
        {
          enabled: { type: "boolean" },
          dailyReconcileTime: { type: "string" },
          lastReconciledAt: {
            type: "string",
            format: "date-time",
            nullable: true,
          },
        },
        ["enabled", "dailyReconcileTime"],
      ),
      UpdateInventoryAutomationConfigRequest: objectSchema(
        {
          dailyReconcileTime: { type: "string" },
        },
        ["dailyReconcileTime"],
      ),
      GeneralSettings: objectSchema(
        {
          appName: { type: "string", example: "RescueBase" },
          appSubtitle: { type: "string", example: "Sanitätslager" },
          showLogo: { type: "boolean", example: true },
          showAppName: { type: "boolean", example: false },
          showAppSubtitle: { type: "boolean", example: true },
          timezone: { type: "string", example: "Europe/Berlin" },
          newUserOrderNotificationsDefaultEnabled: { type: "boolean" },
        },
        [
          "appName",
          "appSubtitle",
          "showLogo",
          "showAppName",
          "showAppSubtitle",
          "timezone",
          "newUserOrderNotificationsDefaultEnabled",
        ],
      ),
      AlertSettings: objectSchema(
        {
          dailyDigestEnabled: { type: "boolean" },
          dailyDigestTime: {
            type: "string",
            pattern: "^(?:[01]\\d|2[0-3]):[0-5]\\d$",
          },
          warningWindowDays: { type: "integer", minimum: 1, maximum: 3650 },
          lastDigestRunAt: {
            type: "string",
            format: "date-time",
            nullable: true,
          },
          lastDigestSentAt: {
            type: "string",
            format: "date-time",
            nullable: true,
          },
        },
        [
          "dailyDigestEnabled",
          "dailyDigestTime",
          "warningWindowDays",
          "lastDigestRunAt",
          "lastDigestSentAt",
        ],
      ),
      DailyDigestResult: objectSchema(
        {
          recipientCount: { type: "integer", minimum: 0 },
          warningCount: { type: "integer", minimum: 0 },
        },
        ["recipientCount", "warningCount"],
      ),
      AdminInventorySettings: objectSchema(
        {
          enabled: { type: "boolean" },
          dailyReconcileTime: {
            type: "string",
            pattern: "^(?:[01]\\d|2[0-3]):[0-5]\\d$",
          },
          lastReconciledAt: {
            type: "string",
            format: "date-time",
            nullable: true,
          },
        },
        ["enabled", "dailyReconcileTime", "lastReconciledAt"],
      ),
      NotificationTemplateKey: stringEnum([
        "ALERT_IMMEDIATE",
        "ALERT_DIGEST",
        "NEW_ORDER",
      ]),
      NotificationTemplate: objectSchema(
        {
          key: ref("NotificationTemplateKey"),
          subjectTemplate: { type: "string" },
          introTemplate: { type: "string" },
          bodyTemplate: { type: "string" },
          allowedPlaceholders: arrayOf({ type: "string" }),
        },
        [
          "key",
          "subjectTemplate",
          "introTemplate",
          "bodyTemplate",
          "allowedPlaceholders",
        ],
      ),
      AdminSettings: objectSchema(
        {
          general: ref("GeneralSettings"),
          alerts: ref("AlertSettings"),
          inventory: ref("AdminInventorySettings"),
          templates: arrayOf(ref("NotificationTemplate")),
        },
        ["general", "alerts", "inventory", "templates"],
      ),
      UpdateGeneralSettingsRequest: objectSchema({
        appName: { type: "string" },
        appSubtitle: { type: "string" },
        showLogo: { type: "boolean" },
        showAppName: { type: "boolean" },
        showAppSubtitle: { type: "boolean" },
        timezone: { type: "string" },
        newUserOrderNotificationsDefaultEnabled: { type: "boolean" },
      }),
      UpdateAlertSettingsRequest: objectSchema({
        dailyDigestEnabled: { type: "boolean" },
        dailyDigestTime: { type: "string" },
        warningWindowDays: { type: "integer", minimum: 1, maximum: 3650 },
      }),
      UpdateAdminInventorySettingsRequest: objectSchema({
        enabled: { type: "boolean" },
        dailyReconcileTime: { type: "string" },
      }),
      UpdateNotificationTemplateRequest: objectSchema({
        subjectTemplate: { type: "string" },
        introTemplate: { type: "string" },
        bodyTemplate: { type: "string" },
      }),
      NotificationTemplatePreview: objectSchema(
        {
          subject: { type: "string" },
          text: { type: "string" },
          html: { type: "string" },
        },
        ["subject", "text", "html"],
      ),
      ExpiryWarning: objectSchema(
        {
          id: { type: "string" },
          articleId: { type: "string" },
          locationId: { type: "string" },
          lotNumber: { type: "string" },
          expiresAt: { type: "string", format: "date" },
          quantity: { type: "integer" },
          article: objectSchema(
            {
              id: { type: "string" },
              name: { type: "string" },
              unit: { type: "string" },
            },
            ["id", "name", "unit"],
          ),
          location: objectSchema(
            { id: { type: "string" }, name: { type: "string" } },
            ["id", "name"],
          ),
          severity: stringEnum(["EXPIRED", "EXPIRING_SOON"]),
        },
        [
          "id",
          "articleId",
          "locationId",
          "lotNumber",
          "expiresAt",
          "quantity",
          "article",
          "location",
          "severity",
        ],
      ),
      PublicKitResponse: objectSchema(
        {
          kit: objectSchema(
            {
              id: { type: "string" },
              name: { type: "string" },
              code: { type: "string" },
              status: ref("KitOperationalStatus"),
            },
            ["id", "name", "code", "status"],
          ),
          template: ref("KitTemplate"),
        },
        ["kit", "template"],
      ),
      CheckPositionInput: objectSchema(
        {
          templatePositionId: { type: "string" },
          countedQuantity: { type: "integer", minimum: 0 },
          discardedExpiredQuantity: { type: "integer", minimum: 0 },
          note: { type: "string" },
        },
        ["templatePositionId", "countedQuantity", "discardedExpiredQuantity"],
      ),
      CompleteCheckRequest: objectSchema(
        {
          checkerName: { type: "string" },
          signaturePngDataUrl: { type: "string" },
          positions: arrayOf(ref("CheckPositionInput")),
        },
        ["checkerName", "signaturePngDataUrl", "positions"],
      ),
      CheckEvaluation: objectSchema(
        {
          warnings: arrayOf({ type: "string" }),
        },
        ["warnings"],
      ),
      CheckResponse: objectSchema(
        {
          id: { type: "string" },
          kitId: { type: "string" },
          checkerName: { type: "string" },
          effectiveStatus: ref("KitOperationalStatus"),
          warnings: arrayOf({ type: "string" }),
          signaturePngDataUrl: { type: "string" },
          signatureHash: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
        [
          "id",
          "kitId",
          "checkerName",
          "effectiveStatus",
          "warnings",
          "signaturePngDataUrl",
          "signatureHash",
          "createdAt",
        ],
      ),
      CheckProtocolKit: objectSchema(
        {
          id: { type: "string" },
          name: { type: "string" },
          code: { type: "string" },
        },
        ["id", "name", "code"],
      ),
      CheckProtocolOrder: objectSchema(
        {
          id: { type: "string" },
          status: ref("ReplenishmentStatus"),
        },
        ["id", "status"],
      ),
      CheckProtocolSummary: objectSchema(
        {
          id: { type: "string" },
          checkerName: { type: "string" },
          selectedStatus: ref("KitOperationalStatus"),
          effectiveStatus: ref("KitOperationalStatus"),
          statusReason: { type: "string" },
          warnings: arrayOf({ type: "string" }),
          signatureHash: { type: "string" },
          positionCount: { type: "integer", minimum: 0 },
          deviationCount: { type: "integer", minimum: 0 },
          kit: ref("CheckProtocolKit"),
          replenishmentOrder: ref("CheckProtocolOrder"),
          createdAt: { type: "string", format: "date-time" },
        },
        [
          "id",
          "checkerName",
          "selectedStatus",
          "effectiveStatus",
          "warnings",
          "signatureHash",
          "positionCount",
          "deviationCount",
          "kit",
          "createdAt",
        ],
      ),
      CheckProtocolPosition: objectSchema(
        {
          id: { type: "string" },
          articleId: { type: "string" },
          articleName: { type: "string" },
          moduleName: { type: "string" },
          unit: { type: "string" },
          requiredQuantity: { type: "integer", minimum: 0 },
          countedQuantity: { type: "integer", minimum: 0 },
          discardedExpiredQuantity: { type: "integer", minimum: 0 },
          missingQuantity: { type: "integer", minimum: 0 },
          surplusQuantity: { type: "integer", minimum: 0 },
          critical: { type: "boolean" },
          note: { type: "string" },
        },
        [
          "id",
          "articleId",
          "articleName",
          "unit",
          "requiredQuantity",
          "countedQuantity",
          "discardedExpiredQuantity",
          "missingQuantity",
          "surplusQuantity",
          "critical",
        ],
      ),
      CheckProtocolDetail: objectSchema(
        {
          id: { type: "string" },
          checkerName: { type: "string" },
          selectedStatus: ref("KitOperationalStatus"),
          effectiveStatus: ref("KitOperationalStatus"),
          statusReason: { type: "string" },
          warnings: arrayOf({ type: "string" }),
          signatureHash: { type: "string" },
          signaturePngDataUrl: { type: "string" },
          positionCount: { type: "integer", minimum: 0 },
          deviationCount: { type: "integer", minimum: 0 },
          kit: ref("CheckProtocolKit"),
          replenishmentOrder: ref("CheckProtocolOrder"),
          positions: arrayOf(ref("CheckProtocolPosition")),
          createdAt: { type: "string", format: "date-time" },
        },
        [
          "id",
          "checkerName",
          "selectedStatus",
          "effectiveStatus",
          "warnings",
          "signatureHash",
          "signaturePngDataUrl",
          "positionCount",
          "deviationCount",
          "kit",
          "positions",
          "createdAt",
        ],
      ),
      CheckProtocolPage: objectSchema(
        {
          items: arrayOf(ref("CheckProtocolSummary")),
          page: { type: "integer", minimum: 1 },
          pageSize: { type: "integer", minimum: 1 },
          total: { type: "integer", minimum: 0 },
        },
        ["items", "page", "pageSize", "total"],
      ),
      ReplenishmentOrderItem: objectSchema(
        {
          articleId: { type: "string" },
          articleName: { type: "string" },
          templatePositionId: { type: "string" },
          requestedQuantity: { type: "integer", minimum: 0 },
          fulfilledQuantity: { type: "integer", minimum: 0 },
          unit: { type: "string" },
          reason: ref("ReplenishmentReason"),
          critical: { type: "boolean" },
        },
        [
          "articleId",
          "articleName",
          "templatePositionId",
          "requestedQuantity",
          "fulfilledQuantity",
          "unit",
          "reason",
          "critical",
        ],
      ),
      ReplenishmentOrder: objectSchema(
        {
          id: { type: "string" },
          kitId: { type: "string" },
          checkId: { type: "string" },
          status: ref("ReplenishmentStatus"),
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          kit: ref("KitSummary"),
          items: arrayOf(ref("ReplenishmentOrderItem")),
        },
        ["id", "kitId", "status", "createdAt", "updatedAt", "items"],
      ),
      CompleteCheckResponse: objectSchema(
        {
          check: ref("CheckResponse"),
          evaluation: ref("CheckEvaluation"),
          replenishmentOrder: ref("ReplenishmentOrder"),
        },
        ["check", "evaluation"],
      ),
      FulfillOrderItemRequest: objectSchema(
        {
          itemId: { type: "string" },
          batchId: { type: "string" },
          quantity: { type: "integer", minimum: 0 },
        },
        ["itemId", "batchId", "quantity"],
      ),
      FulfillOrderRequest: objectSchema(
        {
          items: arrayOf(ref("FulfillOrderItemRequest")),
        },
        ["items"],
      ),
      FulfillOrderResponse: objectSchema(
        {
          order: ref("ReplenishmentOrder"),
          completed: { type: "boolean" },
          remainingQuantity: { type: "integer", minimum: 0 },
        },
        ["order", "completed", "remainingQuantity"],
      ),
      AuditEvent: objectSchema(
        {
          id: { type: "string" },
          actorType: stringEnum(["SYSTEM", "USER", "PUBLIC_CHECKER"]),
          actorLabel: { type: "string" },
          action: { type: "string" },
          entityType: { type: "string" },
          entityId: { type: "string" },
          payload: { type: "object", additionalProperties: true },
          createdAt: { type: "string", format: "date-time" },
        },
        [
          "id",
          "actorType",
          "actorLabel",
          "action",
          "entityType",
          "entityId",
          "payload",
          "createdAt",
        ],
      ),
      OkResponse: objectSchema({ ok: { type: "boolean", enum: [true] } }, [
        "ok",
      ]),
    },
  },
  security: [{ sessionCookie: [] }],
  paths: {
    "/admin/settings": {
      get: operation(
        "Admin-Einstellungen",
        "AdminSettingsController_getAll",
        {},
        response(200, "Aggregated app settings", ref("AdminSettings")),
      ),
    },
    "/admin/settings/general": {
      post: operation(
        "Admin-Einstellungen",
        "AdminSettingsController_updateGeneral",
        request("UpdateGeneralSettingsRequest"),
        response(201, "General settings updated", ref("GeneralSettings")),
      ),
    },
    "/admin/settings/alerts": {
      post: operation(
        "Admin-Einstellungen",
        "AdminSettingsController_updateAlerts",
        request("UpdateAlertSettingsRequest"),
        response(201, "Alert settings updated", ref("AlertSettings")),
      ),
    },
    "/admin/settings/alerts/digest": {
      post: operation(
        "Admin-Einstellungen",
        "AdminSettingsController_runDailyDigest",
        {},
        response(201, "Daily digest triggered", ref("DailyDigestResult")),
      ),
    },
    "/admin/settings/inventory": {
      post: operation(
        "Admin-Einstellungen",
        "AdminSettingsController_updateInventory",
        request("UpdateAdminInventorySettingsRequest"),
        response(
          201,
          "Inventory settings updated",
          ref("AdminInventorySettings"),
        ),
      ),
    },
    "/admin/settings/templates/{key}": {
      post: operation(
        "Admin-Einstellungen",
        "AdminSettingsController_updateTemplate",
        {
          ...pathParam("key"),
          ...request("UpdateNotificationTemplateRequest"),
        },
        response(
          201,
          "Notification template updated",
          ref("NotificationTemplate"),
        ),
      ),
    },
    "/admin/settings/templates/{key}/preview": {
      post: operation(
        "Admin-Einstellungen",
        "AdminSettingsController_previewTemplate",
        {
          ...pathParam("key"),
          ...request("UpdateNotificationTemplateRequest"),
        },
        response(
          201,
          "Notification template preview",
          ref("NotificationTemplatePreview"),
        ),
      ),
    },
    "/auth/setup/status": {
      get: operation(
        "Auth",
        "AuthController_setupStatus",
        {},
        response(200, "Setup status", ref("SetupStatus")),
        false,
      ),
    },
    "/auth/setup/first-admin": {
      post: operation(
        "Auth",
        "AuthController_createFirstAdmin",
        request("FirstAdminRequest"),
        response(201, "First admin created", ref("FirstAdminResponse")),
        false,
      ),
    },
    "/auth/login": {
      post: operation(
        "Auth",
        "AuthController_login",
        request("LoginRequest"),
        response(201, "Login result", ref("LoginResponse")),
        false,
      ),
    },
    "/auth/invitations/{token}": {
      get: operation(
        "Auth",
        "AuthController_invitation",
        pathParam("token"),
        response(200, "Invitation preview", ref("InvitationPreview")),
        false,
      ),
    },
    "/auth/invitations/accept": {
      post: operation(
        "Auth",
        "AuthController_acceptInvitation",
        request("AcceptInvitationRequest"),
        response(201, "Invitation accepted", ref("AcceptInvitationResponse")),
        false,
      ),
    },
    "/auth/email-changes/{token}": {
      get: operation(
        "Auth",
        "AuthController_emailChange",
        pathParam("token"),
        response(200, "Email change preview", ref("EmailChangePreview")),
        false,
      ),
    },
    "/auth/email-changes/{token}/confirm": {
      post: operation(
        "Auth",
        "AuthController_confirmEmailChange",
        pathParam("token"),
        response(201, "Email change confirmed", ref("OkResponse")),
        false,
      ),
    },
    "/auth/password-reset/request": {
      post: operation(
        "Auth",
        "AuthController_requestPasswordReset",
        request("PasswordResetRequest"),
        response(
          201,
          "Password reset requested",
          ref("PasswordResetRequestResponse"),
        ),
        false,
      ),
    },
    "/auth/password-reset/{token}": {
      get: operation(
        "Auth",
        "AuthController_passwordReset",
        pathParam("token"),
        response(200, "Password reset preview", ref("PasswordResetPreview")),
        false,
      ),
    },
    "/auth/password-reset/confirm": {
      post: operation(
        "Auth",
        "AuthController_confirmPasswordReset",
        request("PasswordResetConfirmRequest"),
        response(201, "Password reset confirmed", ref("OkResponse")),
        false,
      ),
    },
    "/auth/session": {
      get: operation(
        "Auth",
        "AuthController_session",
        {},
        response(200, "Active session", ref("SessionResponse")),
      ),
    },
    "/auth/logout": {
      post: operation(
        "Auth",
        "AuthController_logout",
        {},
        response(201, "Logged out", ref("OkResponse")),
      ),
    },
    "/auth/2fa/totp/setup": {
      post: operation(
        "Auth",
        "AuthController_setupTotp",
        request("CurrentPasswordRequest"),
        response(201, "TOTP setup", ref("TotpSetupResponse")),
      ),
    },
    "/auth/2fa/totp/enable": {
      post: operation(
        "Auth",
        "AuthController_enableTotp",
        request("EnableTotpRequest"),
        response(201, "TOTP enabled", ref("OkResponse")),
      ),
    },
    "/auth/2fa/email/start": {
      post: operation(
        "Auth",
        "AuthController_startEmailTwoFactor",
        request("CurrentPasswordRequest"),
        response(
          201,
          "Email 2FA challenge started",
          ref("EmailTwoFactorStartResponse"),
        ),
      ),
    },
    "/auth/2fa/email/enable": {
      post: operation(
        "Auth",
        "AuthController_enableEmailTwoFactor",
        request("EnableEmailTwoFactorRequest"),
        response(201, "Email 2FA enabled", ref("OkResponse")),
      ),
    },
    "/auth/preferences/order-notifications": {
      post: operation(
        "Auth",
        "AuthController_updateOrderNotifications",
        request("UpdateOrderNotificationsRequest"),
        response(
          201,
          "Order notifications preference updated",
          ref("UpdateOrderNotificationsResponse"),
        ),
      ),
    },
    "/push/config": {
      get: operation("Push", "PushController_configuration", {}, response(200, "Push configuration", ref("PushConfiguration"))),
    },
    "/push/subscriptions/me": {
      get: operation("Push", "PushController_subscriptions", {}, response(200, "Current user push subscriptions", ref("PushSubscriptionEndpoints"))),
    },
    "/push/subscriptions": {
      post: operation("Push", "PushController_register", request("PushSubscriptionRequest"), response(201, "Push subscription saved", ref("OkResponse"))),
      delete: operation("Push", "PushController_remove", request("PushSubscriptionRemovalRequest"), response(200, "Push subscription removed", ref("OkResponse"))),
    },
    "/auth/2fa/disable": {
      post: operation(
        "Auth",
        "AuthController_disableTwoFactor",
        request("CurrentPasswordRequest"),
        response(201, "2FA disabled", ref("OkResponse")),
      ),
    },
    "/auth/invite": {
      post: operation(
        "Auth",
        "AuthController_invite",
        request("InviteUserRequest"),
        response(201, "Invitation", ref("InviteUserResponse")),
      ),
    },
    "/auth/users": {
      get: operation(
        "Auth",
        "AuthController_users",
        {},
        response(200, "Users", arrayOf(ref("UserSummary"))),
      ),
    },
    "/auth/users/{id}/active": {
      post: operation(
        "Auth",
        "AuthController_setUserActive",
        { ...pathParam("id"), ...request("SetUserActiveRequest") },
        response(201, "User activation updated", ref("OkResponse")),
      ),
    },
    "/auth/users/{id}/role": {
      post: operation(
        "Auth",
        "AuthController_setUserRole",
        { ...pathParam("id"), ...request("SetUserRoleRequest") },
        response(201, "User role updated", ref("OkResponse")),
      ),
    },
    "/auth/users/{id}/profile": {
      post: operation(
        "Auth",
        "AuthController_updateUserProfile",
        { ...pathParam("id"), ...request("UpdateUserProfileRequest") },
        response(201, "User profile updated", ref("UpdateUserProfileResponse")),
      ),
    },
    "/auth/users/{id}/invitation/resend": {
      post: operation("Auth", "AuthController_resendInvitation", pathParam("id"), response(201, "Invitation resent", ref("OkResponse"))),
    },
    "/auth/users/{id}/invitation": {
      delete: operation("Auth", "AuthController_revokeInvitation", pathParam("id"), response(200, "Invitation revoked", ref("OkResponse"))),
    },
    "/auth/users/{id}/password-reset": {
      post: operation("Auth", "AuthController_adminPasswordReset", pathParam("id"), response(201, "Password reset sent", ref("OkResponse"))),
    },
    "/auth/users/{id}/sessions/revoke": {
      post: operation("Auth", "AuthController_revokeUserSessions", pathParam("id"), response(201, "Sessions revoked", ref("OkResponse"))),
    },
    "/auth/users/{id}/2fa/reset": {
      post: operation("Auth", "AuthController_resetUserTwoFactor", pathParam("id"), response(201, "Two-factor authentication reset", ref("OkResponse"))),
    },
    "/auth/users/{id}": {
      delete: operation(
        "Auth",
        "AuthController_deleteUser",
        pathParam("id"),
        response(200, "User deleted", ref("OkResponse")),
      ),
    },
    "/catalog/articles": {
      get: operation(
        "Stammdaten",
        "CatalogController_articles",
        {},
        response(200, "Articles", arrayOf(ref("Article"))),
      ),
      post: operation(
        "Stammdaten",
        "CatalogController_createArticle",
        request("CreateArticleRequest"),
        response(201, "Article created", ref("Article")),
      ),
    },
    "/catalog/articles/reorder": {
      post: operation(
        "Stammdaten",
        "CatalogController_reorderArticles",
        request("ReorderArticlesRequest"),
        response(201, "Articles reordered", ref("OkResponse")),
      ),
    },
    "/catalog/articles/{id}": {
      patch: operation(
        "Stammdaten",
        "CatalogController_updateArticle",
        { ...pathParam("id"), ...request("UpdateArticleRequest") },
        response(200, "Article updated", ref("Article")),
      ),
      delete: operation(
        "Stammdaten",
        "CatalogController_deleteArticle",
        pathParam("id"),
        response(200, "Article deleted", ref("OkResponse")),
      ),
    },
    "/catalog/suppliers": {
      get: operation(
        "Stammdaten",
        "CatalogController_suppliers",
        {},
        response(200, "Suppliers", arrayOf(ref("Supplier"))),
      ),
      post: operation(
        "Stammdaten",
        "CatalogController_createSupplier",
        request("CreateSupplierRequest"),
        response(201, "Supplier created", ref("Supplier")),
      ),
    },
    "/catalog/suppliers/{id}": {
      patch: operation(
        "Stammdaten",
        "CatalogController_updateSupplier",
        { ...pathParam("id"), ...request("UpdateSupplierRequest") },
        response(200, "Supplier updated", ref("Supplier")),
      ),
      delete: operation(
        "Stammdaten",
        "CatalogController_deleteSupplier",
        pathParam("id"),
        response(200, "Supplier deleted", ref("OkResponse")),
      ),
    },
    "/catalog/locations": {
      get: operation(
        "Stammdaten",
        "CatalogController_locations",
        {},
        response(200, "Locations", arrayOf(ref("Location"))),
      ),
      post: operation(
        "Stammdaten",
        "CatalogController_createLocation",
        request("CreateLocationRequest"),
        response(201, "Location created", ref("Location")),
      ),
    },
    "/catalog/locations/{id}": {
      patch: operation(
        "Stammdaten",
        "CatalogController_updateLocation",
        { ...pathParam("id"), ...request("UpdateLocationRequest") },
        response(200, "Location updated", ref("Location")),
      ),
      delete: operation(
        "Stammdaten",
        "CatalogController_deleteLocation",
        pathParam("id"),
        response(200, "Location deleted", ref("OkResponse")),
      ),
    },
    "/catalog/devices": {
      get: operation(
        "Stammdaten",
        "MedicalDevicesController_list",
        {},
        response(200, "Medical devices", arrayOf(ref("MedicalDevice"))),
      ),
      post: operation(
        "Stammdaten",
        "MedicalDevicesController_create",
        request("MedicalDeviceWriteRequest"),
        response(201, "Medical device created", ref("MedicalDevice")),
      ),
    },
    "/catalog/devices/{id}": {
      patch: operation(
        "Stammdaten",
        "MedicalDevicesController_update",
        { ...pathParam("id"), ...request("MedicalDeviceWriteRequest") },
        response(200, "Medical device updated", ref("MedicalDevice")),
      ),
      delete: operation(
        "Stammdaten",
        "MedicalDevicesController_delete",
        pathParam("id"),
        response(200, "Medical device deleted", ref("OkResponse")),
      ),
    },
    "/catalog/templates": {
      get: operation(
        "Stammdaten",
        "CatalogController_templates",
        {},
        response(200, "Templates", arrayOf(ref("KitTemplate"))),
      ),
      post: operation(
        "Stammdaten",
        "CatalogController_createTemplate",
        request("CreateTemplateRequest"),
        response(201, "Template created", ref("KitTemplate")),
      ),
    },
    "/catalog/templates/{id}/revise": {
      post: operation(
        "Stammdaten",
        "CatalogController_reviseTemplate",
        { ...pathParam("id"), ...request("ReviseTemplateRequest") },
        response(201, "Template revised", ref("KitTemplate")),
      ),
    },
    "/catalog/templates/{id}": {
      delete: operation(
        "Stammdaten",
        "CatalogController_deleteTemplate",
        pathParam("id"),
        response(200, "Template deleted", ref("OkResponse")),
      ),
    },
    "/catalog/kits": {
      get: operation(
        "Stammdaten",
        "CatalogController_kits",
        {},
        response(200, "Kits", arrayOf(ref("Kit"))),
      ),
      post: operation(
        "Stammdaten",
        "CatalogController_createKit",
        request("CreateKitRequest"),
        response(201, "Kit created", ref("Kit")),
      ),
    },
    "/catalog/kits/{id}": {
      patch: operation(
        "Stammdaten",
        "CatalogController_updateKit",
        { ...pathParam("id"), ...request("UpdateKitRequest") },
        response(200, "Kit updated", ref("Kit")),
      ),
      delete: operation(
        "Stammdaten",
        "CatalogController_deleteKit",
        pathParam("id"),
        response(200, "Kit deleted", ref("OkResponse")),
      ),
    },
    "/catalog/kits/{id}/rotate-token": {
      post: operation(
        "Stammdaten",
        "CatalogController_rotateToken",
        pathParam("id"),
        response(201, "Kit token rotated", ref("Kit")),
      ),
    },
    "/inventory/batches": {
      get: operation(
        "Lager",
        "InventoryController_batches",
        {},
        response(200, "Batches", arrayOf(ref("Batch"))),
      ),
      post: operation(
        "Lager",
        "InventoryController_createBatch",
        request("CreateBatchRequest"),
        response(201, "Batch created", ref("Batch")),
      ),
    },
    "/inventory/targets": {
      get: operation(
        "Lager",
        "InventoryController_targets",
        {},
        response(200, "Inventory targets", arrayOf(ref("InventoryTarget"))),
      ),
    },
    "/inventory/targets/reconcile": {
      post: operation(
        "Lager",
        "InventoryController_reconcileTargets",
        {},
        response(
          201,
          "Inventory targets reconciled",
          ref("InventoryReconcileResponse"),
        ),
      ),
    },
    "/inventory/targets/{articleId}/{locationId}": {
      put: operation(
        "Lager",
        "InventoryController_upsertTarget",
        {
          ...pathParams(["articleId", "locationId"]),
          ...request("UpsertInventoryTargetRequest"),
        },
        response(200, "Inventory target saved", ref("InventoryTarget")),
      ),
      delete: operation(
        "Lager",
        "InventoryController_clearTarget",
        pathParams(["articleId", "locationId"]),
        response(200, "Inventory target cleared", ref("OkResponse")),
      ),
    },
    "/inventory/procurement-orders": {
      get: operation(
        "Lager",
        "InventoryController_procurementOrders",
        {},
        response(
          200,
          "Procurement orders",
          arrayOf(ref("InventoryProcurementOrder")),
        ),
      ),
    },
    "/inventory/procurement-orders/{id}/start": {
      post: operation(
        "Lager",
        "InventoryController_startProcurementOrder",
        pathParam("id"),
        response(
          201,
          "Procurement order started",
          ref("InventoryProcurementOrder"),
        ),
      ),
    },
    "/inventory/procurement-orders/{id}/receive": {
      post: operation(
        "Lager",
        "InventoryController_receiveProcurementOrder",
        { ...pathParam("id"), ...request("ReceiveProcurementOrderRequest") },
        response(
          201,
          "Procurement order received",
          ref("InventoryProcurementOrder"),
        ),
      ),
    },
    "/inventory/procurement-orders/{id}/cancel": {
      post: operation(
        "Lager",
        "InventoryController_cancelProcurementOrder",
        pathParam("id"),
        response(
          201,
          "Procurement order cancelled",
          ref("InventoryProcurementOrder"),
        ),
      ),
    },
    "/inventory/automation-config": {
      get: operation(
        "Lager",
        "InventoryController_automationConfig",
        {},
        response(
          200,
          "Inventory automation config",
          ref("InventoryAutomationConfig"),
        ),
      ),
      post: operation(
        "Lager",
        "InventoryController_updateAutomationConfig",
        request("UpdateInventoryAutomationConfigRequest"),
        response(
          201,
          "Inventory automation config updated",
          ref("InventoryAutomationConfig"),
        ),
      ),
    },
    "/inventory/batches/{id}/movements": {
      get: operation(
        "Lager",
        "InventoryController_movements",
        pathParam("id"),
        response(200, "Batch movements", arrayOf(ref("InventoryMovement"))),
      ),
    },
    "/inventory/batches/{id}": {
      delete: operation(
        "Lager",
        "InventoryController_deleteBatch",
        pathParam("id"),
        response(200, "Batch deleted", ref("OkResponse")),
      ),
    },
    "/inventory/batches/{id}/corrections": {
      post: operation(
        "Lager",
        "InventoryController_correctBatch",
        { ...pathParam("id"), ...request("BatchCorrectionRequest") },
        response(201, "Batch corrected", ref("Batch")),
      ),
    },
    "/inventory/expiry-warnings": {
      get: operation(
        "Lager",
        "InventoryController_expiryWarnings",
        {},
        response(200, "Expiry warnings", arrayOf(ref("ExpiryWarning"))),
      ),
    },
    "/purchase-orders": {
      get: operation(
        "Bestellungen",
        "PurchaseOrdersController_list",
        {},
        response(200, "Purchase orders", arrayOf(ref("PurchaseOrder"))),
      ),
      post: operation(
        "Bestellungen",
        "PurchaseOrdersController_create",
        request("PurchaseOrderWriteRequest"),
        response(201, "Purchase order created", ref("PurchaseOrder")),
      ),
    },
    "/purchase-orders/from-shortages": {
      post: operation(
        "Bestellungen",
        "PurchaseOrdersController_createFromShortages",
        request("CreatePurchaseOrdersFromShortagesRequest"),
        response(201, "Purchase orders created", arrayOf(ref("PurchaseOrder"))),
      ),
    },
    "/purchase-orders/{id}": {
      get: operation(
        "Bestellungen",
        "PurchaseOrdersController_get",
        pathParam("id"),
        response(200, "Purchase order", ref("PurchaseOrder")),
      ),
      patch: operation(
        "Bestellungen",
        "PurchaseOrdersController_update",
        { ...pathParam("id"), ...request("UpdatePurchaseOrderRequest") },
        response(200, "Purchase order updated", ref("PurchaseOrder")),
      ),
    },
    "/purchase-orders/{id}/archive": {
      post: operation(
        "Bestellungen",
        "PurchaseOrdersController_archive",
        pathParam("id"),
        response(201, "Purchase order archived", ref("PurchaseOrder")),
      ),
    },
    "/purchase-orders/{id}/restore": {
      post: operation(
        "Bestellungen",
        "PurchaseOrdersController_restore",
        pathParam("id"),
        response(201, "Purchase order restored", ref("PurchaseOrder")),
      ),
    },
    "/purchase-orders/{id}/approve": {
      post: operation(
        "Bestellungen",
        "PurchaseOrdersController_approve",
        pathParam("id"),
        response(201, "Purchase order approved", ref("PurchaseOrder")),
      ),
    },
    "/purchase-orders/{id}/order": {
      post: operation(
        "Bestellungen",
        "PurchaseOrdersController_markOrdered",
        pathParam("id"),
        response(201, "Purchase order marked ordered", ref("PurchaseOrder")),
      ),
    },
    "/purchase-orders/{id}/receive": {
      post: operation(
        "Bestellungen",
        "PurchaseOrdersController_receive",
        { ...pathParam("id"), ...request("ReceivePurchaseOrderRequest") },
        response(201, "Purchase order received", ref("PurchaseOrder")),
      ),
    },
    "/public/kits/{token}": {
      get: operation(
        "Öffentliche Checks",
        "PublicChecksController_getPublicKit",
        pathParam("token"),
        response(200, "Public kit", ref("PublicKitResponse")),
        false,
      ),
    },
    "/public/kits/{token}/checks": {
      post: operation(
        "Öffentliche Checks",
        "PublicChecksController_completeCheck",
        { ...pathParam("token"), ...request("CompleteCheckRequest") },
        response(201, "Check completed", ref("CompleteCheckResponse")),
        false,
      ),
    },
    "/checks": {
      get: operation(
        "Check-Protokolle",
        "CheckRecordsController_list",
        {
          parameters: [
            optionalQueryParam("q"),
            optionalQueryParam("kitId"),
            optionalQueryParam("status"),
            optionalQueryParam("page"),
          ],
        },
        response(200, "Check protocols", ref("CheckProtocolPage")),
      ),
    },
    "/checks/{id}": {
      get: operation(
        "Check-Protokolle",
        "CheckRecordsController_detail",
        pathParam("id"),
        response(200, "Check protocol", ref("CheckProtocolDetail")),
      ),
    },
    "/replenishment-orders": {
      get: operation(
        "Nachfüllaufträge",
        "ReplenishmentController_list",
        {},
        response(
          200,
          "Replenishment orders",
          arrayOf(ref("ReplenishmentOrder")),
        ),
      ),
    },
    "/replenishment-orders/{id}/fulfill": {
      post: operation(
        "Nachfüllaufträge",
        "ReplenishmentController_fulfill",
        { ...pathParam("id"), ...request("FulfillOrderRequest") },
        response(201, "Fulfillment booked", ref("FulfillOrderResponse")),
      ),
    },
    "/replenishment-orders/{id}/cancel": {
      post: operation(
        "Nachfüllaufträge",
        "ReplenishmentController_cancel",
        pathParam("id"),
        response(201, "Order cancelled", ref("ReplenishmentOrder")),
      ),
    },
    "/audit": {
      get: operation(
        "Audit",
        "AuditController_list",
        {},
        response(200, "Audit events", arrayOf(ref("AuditEvent"))),
      ),
    },
    "/reports/procurement.pdf": {
      get: fileOperation(
        "Reports",
        "ReportsController_procurement",
        pdf,
        undefined,
        [
          optionalQueryParam("articleId"),
          optionalQueryParam("locationId"),
          optionalQueryParam("q"),
        ],
      ),
    },
    "/reports/qr-label/{kitId}.pdf": {
      get: fileOperation("Reports", "ReportsController_qrLabel", pdf, "kitId", [
        {
          name: "format",
          in: "query",
          required: false,
          schema: stringEnum(["a4", "label"]),
        },
      ]),
    },
    "/reports/templates/{templateId}.pdf": {
      get: fileOperation("Reports", "ReportsController_kitTemplate", pdf, "templateId"),
    },
    "/reports/replenishment/{orderId}.pdf": {
      get: fileOperation(
        "Reports",
        "ReportsController_replenishment",
        pdf,
        "orderId",
      ),
    },
    "/reports/purchase-orders/{orderId}.pdf": {
      get: fileOperation(
        "Reports",
        "ReportsController_purchaseOrder",
        pdf,
        "orderId",
        [
          {
            name: "includeLineNotes",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["true", "false"] },
          },
        ],
      ),
    },
  },
};

export const rescueBaseOpenApiDocument =
  rescueBaseOpenApiDocumentDefinition as unknown as OpenAPIObject;

function ref(name: string): OpenApiFragment {
  return { $ref: `#/components/schemas/${name}` };
}

function stringEnum(values: string[]): OpenApiFragment {
  return { type: "string", enum: values };
}

function arrayOf(items: object): OpenApiFragment {
  return { type: "array", items };
}

function objectSchema(
  properties: Record<string, object>,
  required: string[] = [],
): OpenApiFragment {
  return { type: "object", properties, required, additionalProperties: false };
}

function request(schemaName: string): OpenApiFragment {
  return {
    requestBody: {
      required: true,
      content: { [json]: { schema: ref(schemaName) } },
    },
  };
}

function pathParam(name: string): OpenApiFragment {
  return {
    parameters: [
      {
        name,
        in: "path",
        required: true,
        schema: { type: "string" },
      },
    ],
  };
}

function optionalQueryParam(name: string): Record<string, unknown> {
  return {
    name,
    in: "query",
    required: false,
    schema: { type: "string" },
  };
}

function pathParams(names: string[]): OpenApiFragment {
  return {
    parameters: names.map((name) => ({
      name,
      in: "path",
      required: true,
      schema: { type: "string" },
    })),
  };
}

function response(
  status: number,
  description: string,
  schema: object,
): OpenApiFragment {
  return {
    responses: {
      [status]: {
        description,
        content: { [json]: { schema } },
      },
    },
  };
}

function operation(
  tag: string,
  operationId: string,
  input: object,
  output: object,
  protectedRoute = true,
): OpenApiFragment {
  return {
    tags: [tag],
    operationId,
    ...(protectedRoute ? {} : { security: [] }),
    ...input,
    ...output,
  };
}

function fileOperation(
  tag: string,
  operationId: string,
  contentType: string,
  pathName?: string,
  extraParameters: Array<Record<string, unknown>> = [],
): OpenApiFragment {
  return {
    tags: [tag],
    operationId,
    ...(pathName || extraParameters.length > 0
      ? {
          parameters: [
            ...(pathName
              ? (pathParam(pathName).parameters as Array<
                  Record<string, unknown>
                >)
              : []),
            ...extraParameters,
          ],
        }
      : {}),
    responses: {
      200: {
        description: "Binary report",
        content: {
          [contentType]: { schema: { type: "string", format: "binary" } },
        },
      },
    },
  };
}
