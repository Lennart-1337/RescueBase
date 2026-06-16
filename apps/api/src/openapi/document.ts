import type { OpenAPIObject } from "@nestjs/swagger";

type OpenApiFragment = Record<string, unknown>;

const json = "application/json";
const csv = "text/csv";
const pdf = "application/pdf";

const rescueBaseOpenApiDocumentDefinition = {
  openapi: "3.0.0",
  info: {
    title: "RescueBase API",
    description: "API for Sanitätslager, Rucksackchecks, Chargen and Nachfüllaufträge.",
    version: "0.1.0"
  },
  servers: [{ url: "/api", description: "Reverse-proxied API base path" }],
  tags: [
    { name: "Auth" },
    { name: "Stammdaten" },
    { name: "Lager" },
    { name: "Öffentliche Checks" },
    { name: "Nachfüllaufträge" },
    { name: "Reports" },
    { name: "Audit" }
  ],
  components: {
    securitySchemes: {
      sessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: "rb_session"
      }
    },
    schemas: {
      UserRole: stringEnum(["ADMIN", "WAREHOUSE"]),
      TwoFactorMethod: stringEnum(["TOTP", "EMAIL"]),
      KitOperationalStatus: stringEnum(["READY", "CONDITIONAL", "NOT_READY"]),
      ReplenishmentStatus: stringEnum(["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"]),
      ReplenishmentReason: stringEnum(["SHORTAGE", "DISCARDED_EXPIRED", "SHORTAGE_AND_DISCARDED_EXPIRED"]),
      SetupStatus: objectSchema({
        initialized: { type: "boolean" },
        firstAdminEmail: { type: "string" }
      }, ["initialized"]),
      AuthenticatedUser: objectSchema({
        id: { type: "string" },
        email: { type: "string", format: "email" },
        displayName: { type: "string" },
        role: ref("UserRole"),
        twoFactorEnabled: { type: "boolean" },
        twoFactorMethod: ref("TwoFactorMethod")
      }, ["id", "email", "displayName", "role", "twoFactorEnabled"]),
      SessionResponse: objectSchema({
        user: ref("AuthenticatedUser")
      }, ["user"]),
      FirstAdminRequest: objectSchema({
        email: { type: "string", format: "email" },
        displayName: { type: "string" },
        password: { type: "string", minLength: 12 }
      }, ["email", "displayName", "password"]),
      FirstAdminResponse: objectSchema({
        ok: { type: "boolean", enum: [true] },
        userId: { type: "string" },
        user: ref("AuthenticatedUser")
      }, ["ok", "userId", "user"]),
      LoginRequest: objectSchema({
        email: { type: "string", format: "email" },
        password: { type: "string" },
        twoFactorCode: { type: "string" },
        emailChallengeId: { type: "string" }
      }, ["email", "password"]),
      LoginResponse: objectSchema({
        requiresTwoFactor: { type: "boolean" },
        twoFactorMethod: ref("TwoFactorMethod"),
        emailChallengeId: { type: "string" },
        debugCode: { type: "string" },
        user: ref("AuthenticatedUser")
      }, ["requiresTwoFactor"]),
      TotpSetupResponse: objectSchema({
        secret: { type: "string" },
        otpauthUrl: { type: "string" }
      }, ["secret", "otpauthUrl"]),
      EnableTotpRequest: objectSchema({
        code: { type: "string" }
      }, ["code"]),
      EmailTwoFactorStartResponse: objectSchema({
        challengeId: { type: "string" },
        debugCode: { type: "string" }
      }, ["challengeId"]),
      EnableEmailTwoFactorRequest: objectSchema({
        challengeId: { type: "string" },
        code: { type: "string" }
      }, ["challengeId", "code"]),
      InviteUserRequest: objectSchema({
        email: { type: "string", format: "email" },
        displayName: { type: "string" },
        role: ref("UserRole")
      }, ["email", "displayName", "role"]),
      InviteUserResponse: objectSchema({
        id: { type: "string" },
        invitationUrl: { type: "string", format: "uri" },
        debugUrl: { type: "string", format: "uri" }
      }, ["id", "invitationUrl"]),
      InvitationPreview: objectSchema({
        email: { type: "string", format: "email" },
        displayName: { type: "string" },
        role: ref("UserRole")
      }, ["email", "displayName", "role"]),
      AcceptInvitationRequest: objectSchema({
        token: { type: "string" },
        password: { type: "string", minLength: 12 },
        displayName: { type: "string" }
      }, ["token", "password"]),
      AcceptInvitationResponse: objectSchema({
        ok: { type: "boolean", enum: [true] },
        user: ref("AuthenticatedUser")
      }, ["ok", "user"]),
      PasswordResetRequest: objectSchema({
        email: { type: "string", format: "email" }
      }, ["email"]),
      PasswordResetRequestResponse: objectSchema({
        ok: { type: "boolean", enum: [true] },
        debugUrl: { type: "string", format: "uri" }
      }, ["ok"]),
      PasswordResetPreview: objectSchema({
        email: { type: "string", format: "email" },
        displayName: { type: "string" }
      }, ["email", "displayName"]),
      PasswordResetConfirmRequest: objectSchema({
        token: { type: "string" },
        password: { type: "string", minLength: 12 }
      }, ["token", "password"]),
      UserSummary: objectSchema({
        id: { type: "string" },
        email: { type: "string", format: "email" },
        displayName: { type: "string" },
        role: ref("UserRole"),
        active: { type: "boolean" },
        twoFactorEnabled: { type: "boolean" },
        twoFactorMethod: ref("TwoFactorMethod")
      }, ["id", "email", "displayName", "role", "active", "twoFactorEnabled"]),
      SetUserActiveRequest: objectSchema({
        active: { type: "boolean" }
      }, ["active"]),
      Article: objectSchema({
        id: { type: "string" },
        name: { type: "string" },
        unit: { type: "string" },
        manufacturer: { type: "string" },
        manufacturerPartNumber: { type: "string" },
        category: { type: "string" },
        barcode: { type: "string" },
        sterile: { type: "boolean" },
        storageNotes: { type: "string" },
        notes: { type: "string" },
        criticalDefault: { type: "boolean" },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" }
      }, ["id", "name", "unit", "sterile", "criticalDefault"]),
      CreateArticleRequest: objectSchema({
        name: { type: "string" },
        unit: { type: "string" },
        manufacturer: { type: "string" },
        manufacturerPartNumber: { type: "string" },
        category: { type: "string" },
        barcode: { type: "string" },
        sterile: { type: "boolean" },
        storageNotes: { type: "string" },
        notes: { type: "string" },
        criticalDefault: { type: "boolean" }
      }, ["name", "unit", "sterile", "criticalDefault"]),
      UpdateArticleRequest: objectSchema({
        name: { type: "string" },
        unit: { type: "string" },
        manufacturer: { type: "string" },
        manufacturerPartNumber: { type: "string" },
        category: { type: "string" },
        barcode: { type: "string" },
        sterile: { type: "boolean" },
        storageNotes: { type: "string" },
        notes: { type: "string" },
        criticalDefault: { type: "boolean" }
      }, ["name", "unit", "sterile", "criticalDefault"]),
      Location: objectSchema({
        id: { type: "string" },
        name: { type: "string" },
        kind: { type: "string" },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" }
      }, ["id", "name", "kind"]),
      CreateLocationRequest: objectSchema({
        name: { type: "string" },
        kind: { type: "string" }
      }, ["name", "kind"]),
      UpdateLocationRequest: objectSchema({
        name: { type: "string" },
        kind: { type: "string" }
      }, ["name", "kind"]),
      TemplatePosition: objectSchema({
        id: { type: "string" },
        articleId: { type: "string" },
        articleName: { type: "string" },
        moduleName: { type: "string" },
        requiredQuantity: { type: "integer", minimum: 1 },
        unit: { type: "string" },
        critical: { type: "boolean" }
      }, ["id", "articleId", "articleName", "requiredQuantity", "unit", "critical"]),
      KitTemplate: objectSchema({
        id: { type: "string" },
        name: { type: "string" },
        version: { type: "integer", minimum: 1 },
        positions: arrayOf(ref("TemplatePosition"))
      }, ["id", "name", "version", "positions"]),
      CreateTemplatePositionRequest: objectSchema({
        articleId: { type: "string" },
        moduleName: { type: "string" },
        requiredQuantity: { type: "integer", minimum: 1 },
        critical: { type: "boolean" }
      }, ["articleId", "requiredQuantity", "critical"]),
      CreateTemplateRequest: objectSchema({
        name: { type: "string" },
        version: { type: "integer", minimum: 1 },
        positions: arrayOf(ref("CreateTemplatePositionRequest"))
      }, ["name", "positions"]),
      ReviseTemplateRequest: objectSchema({
        positions: arrayOf(ref("CreateTemplatePositionRequest"))
      }, ["positions"]),
      Kit: objectSchema({
        id: { type: "string" },
        name: { type: "string" },
        code: { type: "string" },
        locationId: { type: "string" },
        templateId: { type: "string" },
        status: ref("KitOperationalStatus"),
        publicToken: { type: "string" },
        tokenRotatedAt: { type: "string", format: "date-time" },
        location: objectSchema({ id: { type: "string" }, name: { type: "string" } }, ["id", "name"]),
        template: ref("KitTemplate")
      }, ["id", "name", "code", "locationId", "templateId", "status", "publicToken", "tokenRotatedAt"]),
      KitSummary: objectSchema({
        id: { type: "string" },
        name: { type: "string" },
        code: { type: "string" },
        status: ref("KitOperationalStatus"),
        publicToken: { type: "string" }
      }, ["id", "name", "code", "status", "publicToken"]),
      CreateKitRequest: objectSchema({
        name: { type: "string" },
        code: { type: "string" },
        locationId: { type: "string" },
        templateId: { type: "string" }
      }, ["name", "code", "locationId", "templateId"]),
      UpdateKitRequest: objectSchema({
        name: { type: "string" },
        code: { type: "string" },
        locationId: { type: "string" },
        templateId: { type: "string" }
      }, ["name", "code", "locationId", "templateId"]),
      Batch: objectSchema({
        id: { type: "string" },
        articleId: { type: "string" },
        locationId: { type: "string" },
        lotNumber: { type: "string" },
        expiresAt: { type: "string", format: "date" },
        quantity: { type: "integer", minimum: 0 },
        article: objectSchema({ id: { type: "string" }, name: { type: "string" }, unit: { type: "string" } }, ["id", "name", "unit"]),
        location: objectSchema({ id: { type: "string" }, name: { type: "string" } }, ["id", "name"])
      }, ["id", "articleId", "locationId", "lotNumber", "expiresAt", "quantity", "article", "location"]),
      CreateBatchRequest: objectSchema({
        articleId: { type: "string" },
        locationId: { type: "string" },
        lotNumber: { type: "string" },
        expiresAt: { type: "string", format: "date" },
        quantity: { type: "integer", minimum: 0 }
      }, ["articleId", "locationId", "lotNumber", "expiresAt", "quantity"]),
      BatchCorrectionRequest: objectSchema({
        reason: { type: "string" },
        quantity: { type: "integer", minimum: 0 },
        lotNumber: { type: "string" },
        expiresAt: { type: "string", format: "date" },
        locationId: { type: "string" }
      }, ["reason"]),
      InventoryMovement: objectSchema({
        id: { type: "string" },
        batchId: { type: "string" },
        articleId: { type: "string" },
        locationId: { type: "string" },
        replenishmentOrderId: { type: "string" },
        templatePositionId: { type: "string" },
        type: { type: "string" },
        quantity: { type: "integer" },
        actorLabel: { type: "string" },
        reason: { type: "string" },
        metadata: { type: "object", additionalProperties: true },
        createdAt: { type: "string", format: "date-time" }
      }, ["id", "batchId", "articleId", "locationId", "type", "quantity", "actorLabel", "createdAt"]),
      ExpiryWarning: objectSchema({
        id: { type: "string" },
        articleId: { type: "string" },
        locationId: { type: "string" },
        lotNumber: { type: "string" },
        expiresAt: { type: "string", format: "date" },
        quantity: { type: "integer" },
        article: objectSchema({ id: { type: "string" }, name: { type: "string" }, unit: { type: "string" } }, ["id", "name", "unit"]),
        location: objectSchema({ id: { type: "string" }, name: { type: "string" } }, ["id", "name"]),
        severity: stringEnum(["EXPIRED", "EXPIRING_SOON"])
      }, ["id", "articleId", "locationId", "lotNumber", "expiresAt", "quantity", "article", "location", "severity"]),
      PublicKitResponse: objectSchema({
        kit: objectSchema({
          id: { type: "string" },
          name: { type: "string" },
          code: { type: "string" },
          status: ref("KitOperationalStatus")
        }, ["id", "name", "code", "status"]),
        template: ref("KitTemplate")
      }, ["kit", "template"]),
      CheckPositionInput: objectSchema({
        templatePositionId: { type: "string" },
        countedQuantity: { type: "integer", minimum: 0 },
        discardedExpiredQuantity: { type: "integer", minimum: 0 },
        note: { type: "string" }
      }, ["templatePositionId", "countedQuantity", "discardedExpiredQuantity"]),
      CompleteCheckRequest: objectSchema({
        checkerName: { type: "string" },
        signaturePngDataUrl: { type: "string" },
        positions: arrayOf(ref("CheckPositionInput"))
      }, ["checkerName", "signaturePngDataUrl", "positions"]),
      CheckEvaluation: objectSchema({
        warnings: arrayOf({ type: "string" })
      }, ["warnings"]),
      CheckResponse: objectSchema({
        id: { type: "string" },
        kitId: { type: "string" },
        checkerName: { type: "string" },
        effectiveStatus: ref("KitOperationalStatus"),
        warnings: arrayOf({ type: "string" }),
        signaturePngDataUrl: { type: "string" },
        signatureHash: { type: "string" },
        createdAt: { type: "string", format: "date-time" }
      }, ["id", "kitId", "checkerName", "effectiveStatus", "warnings", "signaturePngDataUrl", "signatureHash", "createdAt"]),
      ReplenishmentOrderItem: objectSchema({
        articleId: { type: "string" },
        articleName: { type: "string" },
        templatePositionId: { type: "string" },
        requestedQuantity: { type: "integer", minimum: 0 },
        fulfilledQuantity: { type: "integer", minimum: 0 },
        unit: { type: "string" },
        reason: ref("ReplenishmentReason"),
        critical: { type: "boolean" }
      }, ["articleId", "articleName", "templatePositionId", "requestedQuantity", "fulfilledQuantity", "unit", "reason", "critical"]),
      ReplenishmentOrder: objectSchema({
        id: { type: "string" },
        kitId: { type: "string" },
        checkId: { type: "string" },
        status: ref("ReplenishmentStatus"),
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
        kit: ref("KitSummary"),
        items: arrayOf(ref("ReplenishmentOrderItem"))
      }, ["id", "kitId", "status", "createdAt", "updatedAt", "items"]),
      CompleteCheckResponse: objectSchema({
        check: ref("CheckResponse"),
        evaluation: ref("CheckEvaluation"),
        replenishmentOrder: ref("ReplenishmentOrder")
      }, ["check", "evaluation"]),
      FulfillOrderItemRequest: objectSchema({
        itemId: { type: "string" },
        batchId: { type: "string" },
        quantity: { type: "integer", minimum: 0 }
      }, ["itemId", "batchId", "quantity"]),
      FulfillOrderRequest: objectSchema({
        items: arrayOf(ref("FulfillOrderItemRequest"))
      }, ["items"]),
      FulfillOrderResponse: objectSchema({
        order: ref("ReplenishmentOrder"),
        completed: { type: "boolean" },
        remainingQuantity: { type: "integer", minimum: 0 }
      }, ["order", "completed", "remainingQuantity"]),
      AuditEvent: objectSchema({
        id: { type: "string" },
        actorType: stringEnum(["SYSTEM", "USER", "PUBLIC_CHECKER"]),
        actorLabel: { type: "string" },
        action: { type: "string" },
        entityType: { type: "string" },
        entityId: { type: "string" },
        payload: { type: "object", additionalProperties: true },
        createdAt: { type: "string", format: "date-time" }
      }, ["id", "actorType", "actorLabel", "action", "entityType", "entityId", "payload", "createdAt"]),
      OkResponse: objectSchema({ ok: { type: "boolean", enum: [true] } }, ["ok"])
    }
  },
  security: [{ sessionCookie: [] }],
  paths: {
    "/auth/setup/status": { get: operation("Auth", "AuthController_setupStatus", {}, response(200, "Setup status", ref("SetupStatus")), false) },
    "/auth/setup/first-admin": { post: operation("Auth", "AuthController_createFirstAdmin", request("FirstAdminRequest"), response(201, "First admin created", ref("FirstAdminResponse")), false) },
    "/auth/login": { post: operation("Auth", "AuthController_login", request("LoginRequest"), response(201, "Login result", ref("LoginResponse")), false) },
    "/auth/invitations/{token}": { get: operation("Auth", "AuthController_invitation", pathParam("token"), response(200, "Invitation preview", ref("InvitationPreview")), false) },
    "/auth/invitations/accept": { post: operation("Auth", "AuthController_acceptInvitation", request("AcceptInvitationRequest"), response(201, "Invitation accepted", ref("AcceptInvitationResponse")), false) },
    "/auth/password-reset/request": { post: operation("Auth", "AuthController_requestPasswordReset", request("PasswordResetRequest"), response(201, "Password reset requested", ref("PasswordResetRequestResponse")), false) },
    "/auth/password-reset/{token}": { get: operation("Auth", "AuthController_passwordReset", pathParam("token"), response(200, "Password reset preview", ref("PasswordResetPreview")), false) },
    "/auth/password-reset/confirm": { post: operation("Auth", "AuthController_confirmPasswordReset", request("PasswordResetConfirmRequest"), response(201, "Password reset confirmed", ref("OkResponse")), false) },
    "/auth/session": { get: operation("Auth", "AuthController_session", {}, response(200, "Active session", ref("SessionResponse"))) },
    "/auth/logout": { post: operation("Auth", "AuthController_logout", {}, response(201, "Logged out", ref("OkResponse"))) },
    "/auth/2fa/totp/setup": { post: operation("Auth", "AuthController_setupTotp", {}, response(201, "TOTP setup", ref("TotpSetupResponse"))) },
    "/auth/2fa/totp/enable": { post: operation("Auth", "AuthController_enableTotp", request("EnableTotpRequest"), response(201, "TOTP enabled", ref("OkResponse"))) },
    "/auth/2fa/email/start": { post: operation("Auth", "AuthController_startEmailTwoFactor", {}, response(201, "Email 2FA challenge started", ref("EmailTwoFactorStartResponse"))) },
    "/auth/2fa/email/enable": { post: operation("Auth", "AuthController_enableEmailTwoFactor", request("EnableEmailTwoFactorRequest"), response(201, "Email 2FA enabled", ref("OkResponse"))) },
    "/auth/2fa/disable": { post: operation("Auth", "AuthController_disableTwoFactor", {}, response(201, "2FA disabled", ref("OkResponse"))) },
    "/auth/invite": { post: operation("Auth", "AuthController_invite", request("InviteUserRequest"), response(201, "Invitation", ref("InviteUserResponse"))) },
    "/auth/users": { get: operation("Auth", "AuthController_users", {}, response(200, "Users", arrayOf(ref("UserSummary")))) },
    "/auth/users/{id}/active": { post: operation("Auth", "AuthController_setUserActive", { ...pathParam("id"), ...request("SetUserActiveRequest") }, response(201, "User activation updated", ref("OkResponse"))) },
    "/catalog/articles": {
      get: operation("Stammdaten", "CatalogController_articles", {}, response(200, "Articles", arrayOf(ref("Article")))),
      post: operation("Stammdaten", "CatalogController_createArticle", request("CreateArticleRequest"), response(201, "Article created", ref("Article")))
    },
    "/catalog/articles/{id}": {
      patch: operation("Stammdaten", "CatalogController_updateArticle", { ...pathParam("id"), ...request("UpdateArticleRequest") }, response(200, "Article updated", ref("Article")))
    },
    "/catalog/locations": {
      get: operation("Stammdaten", "CatalogController_locations", {}, response(200, "Locations", arrayOf(ref("Location")))),
      post: operation("Stammdaten", "CatalogController_createLocation", request("CreateLocationRequest"), response(201, "Location created", ref("Location")))
    },
    "/catalog/locations/{id}": {
      patch: operation("Stammdaten", "CatalogController_updateLocation", { ...pathParam("id"), ...request("UpdateLocationRequest") }, response(200, "Location updated", ref("Location")))
    },
    "/catalog/templates": {
      get: operation("Stammdaten", "CatalogController_templates", {}, response(200, "Templates", arrayOf(ref("KitTemplate")))),
      post: operation("Stammdaten", "CatalogController_createTemplate", request("CreateTemplateRequest"), response(201, "Template created", ref("KitTemplate")))
    },
    "/catalog/templates/{id}/revise": {
      post: operation("Stammdaten", "CatalogController_reviseTemplate", { ...pathParam("id"), ...request("ReviseTemplateRequest") }, response(201, "Template revised", ref("KitTemplate")))
    },
    "/catalog/kits": {
      get: operation("Stammdaten", "CatalogController_kits", {}, response(200, "Kits", arrayOf(ref("Kit")))),
      post: operation("Stammdaten", "CatalogController_createKit", request("CreateKitRequest"), response(201, "Kit created", ref("Kit")))
    },
    "/catalog/kits/{id}": {
      patch: operation("Stammdaten", "CatalogController_updateKit", { ...pathParam("id"), ...request("UpdateKitRequest") }, response(200, "Kit updated", ref("Kit")))
    },
    "/catalog/kits/{id}/rotate-token": {
      post: operation("Stammdaten", "CatalogController_rotateToken", pathParam("id"), response(201, "Kit token rotated", ref("Kit")))
    },
    "/inventory/batches": {
      get: operation("Lager", "InventoryController_batches", {}, response(200, "Batches", arrayOf(ref("Batch")))),
      post: operation("Lager", "InventoryController_createBatch", request("CreateBatchRequest"), response(201, "Batch created", ref("Batch")))
    },
    "/inventory/batches/{id}/movements": {
      get: operation("Lager", "InventoryController_movements", pathParam("id"), response(200, "Batch movements", arrayOf(ref("InventoryMovement"))))
    },
    "/inventory/batches/{id}/corrections": {
      post: operation("Lager", "InventoryController_correctBatch", { ...pathParam("id"), ...request("BatchCorrectionRequest") }, response(201, "Batch corrected", ref("Batch")))
    },
    "/inventory/expiry-warnings": {
      get: operation("Lager", "InventoryController_expiryWarnings", {}, response(200, "Expiry warnings", arrayOf(ref("ExpiryWarning"))))
    },
    "/public/kits/{token}": {
      get: operation("Öffentliche Checks", "PublicChecksController_getPublicKit", pathParam("token"), response(200, "Public kit", ref("PublicKitResponse")), false)
    },
    "/public/kits/{token}/checks": {
      post: operation("Öffentliche Checks", "PublicChecksController_completeCheck", { ...pathParam("token"), ...request("CompleteCheckRequest") }, response(201, "Check completed", ref("CompleteCheckResponse")), false)
    },
    "/replenishment-orders": {
      get: operation("Nachfüllaufträge", "ReplenishmentController_list", {}, response(200, "Replenishment orders", arrayOf(ref("ReplenishmentOrder"))))
    },
    "/replenishment-orders/{id}/start": {
      post: operation("Nachfüllaufträge", "ReplenishmentController_start", pathParam("id"), response(201, "Order started", ref("ReplenishmentOrder")))
    },
    "/replenishment-orders/{id}/fulfill": {
      post: operation("Nachfüllaufträge", "ReplenishmentController_fulfill", { ...pathParam("id"), ...request("FulfillOrderRequest") }, response(201, "Fulfillment booked", ref("FulfillOrderResponse")))
    },
    "/replenishment-orders/{id}/cancel": {
      post: operation("Nachfüllaufträge", "ReplenishmentController_cancel", pathParam("id"), response(201, "Order cancelled", ref("ReplenishmentOrder")))
    },
    "/audit": {
      get: operation("Audit", "AuditController_list", {}, response(200, "Audit events", arrayOf(ref("AuditEvent"))))
    },
    "/reports/csv/inventory": { get: fileOperation("Reports", "ReportsController_inventoryCsv", csv) },
    "/reports/csv/replenishment": { get: fileOperation("Reports", "ReportsController_replenishmentCsv", csv) },
    "/reports/qr-label/{kitId}.pdf": {
      get: fileOperation("Reports", "ReportsController_qrLabel", pdf, "kitId", [
        {
          name: "format",
          in: "query",
          required: false,
          schema: stringEnum(["a4", "label"])
        }
      ])
    },
    "/reports/replenishment/{orderId}.pdf": { get: fileOperation("Reports", "ReportsController_replenishment", pdf, "orderId") }
  }
};

export const rescueBaseOpenApiDocument = rescueBaseOpenApiDocumentDefinition as unknown as OpenAPIObject;

function ref(name: string): OpenApiFragment {
  return { $ref: `#/components/schemas/${name}` };
}

function stringEnum(values: string[]): OpenApiFragment {
  return { type: "string", enum: values };
}

function arrayOf(items: object): OpenApiFragment {
  return { type: "array", items };
}

function objectSchema(properties: Record<string, object>, required: string[] = []): OpenApiFragment {
  return { type: "object", properties, required, additionalProperties: false };
}

function request(schemaName: string): OpenApiFragment {
  return {
    requestBody: {
      required: true,
      content: { [json]: { schema: ref(schemaName) } }
    }
  };
}

function pathParam(name: string): OpenApiFragment {
  return {
    parameters: [
      {
        name,
        in: "path",
        required: true,
        schema: { type: "string" }
      }
    ]
  };
}

function response(status: number, description: string, schema: object): OpenApiFragment {
  return {
    responses: {
      [status]: {
        description,
        content: { [json]: { schema } }
      }
    }
  };
}

function operation(tag: string, operationId: string, input: object, output: object, protectedRoute = true): OpenApiFragment {
  return {
    tags: [tag],
    operationId,
    ...(protectedRoute ? {} : { security: [] }),
    ...input,
    ...output
  };
}

function fileOperation(
  tag: string,
  operationId: string,
  contentType: string,
  pathName?: string,
  extraParameters: Array<Record<string, unknown>> = []
): OpenApiFragment {
  return {
    tags: [tag],
    operationId,
    ...((pathName || extraParameters.length > 0)
      ? {
          parameters: [
            ...(pathName ? pathParam(pathName).parameters as Array<Record<string, unknown>> : []),
            ...extraParameters
          ]
        }
      : {}),
    responses: {
      200: {
        description: "Binary report",
        content: { [contentType]: { schema: { type: "string", format: "binary" } } }
      }
    }
  };
}
