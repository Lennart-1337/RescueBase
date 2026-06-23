import { ApiError, openApiClient, reportUrl } from "./openapi-client";
import { adminSettingsApi } from "./admin-settings-api";
import type {
  BatchCorrectionRequest,
  CompleteCheckRequest,
  CreateArticleRequest,
  CreateBatchRequest,
  CreateKitRequest,
  CreateLocationRequest,
  CreateTemplateRequest,
  FulfillOrderRequest,
  InviteUserRequest,
  ReceiveProcurementOrderRequest,
  ReviseTemplateRequest,
  UpdateArticleRequest,
  UpdateInventoryAutomationConfigRequest,
  UpdateKitRequest,
  UpdateLocationRequest,
  UpsertInventoryTargetRequest
} from "./types";

export { ApiError };

export const rescueBaseApi = {
  ...adminSettingsApi,
  setupStatus: () => openApiClient.get("/auth/setup/status"),
  createFirstAdmin: (body: { email: string; displayName: string; password: string }) =>
    openApiClient.post("/auth/setup/first-admin", body),
  login: (body: { email?: string; password?: string; twoFactorCode?: string; emailChallengeId?: string; loginChallengeId?: string }) => openApiClient.post("/auth/login", body),
  invitation: (token: string) => openApiClient.get("/auth/invitations/{token}", { params: { token } }),
  acceptInvitation: (body: { token: string; password: string; displayName?: string }) =>
    openApiClient.post("/auth/invitations/accept", body),
  requestPasswordReset: (body: { email: string }) => openApiClient.post("/auth/password-reset/request", body),
  passwordResetPreview: (token: string) => openApiClient.get("/auth/password-reset/{token}", { params: { token } }),
  confirmPasswordReset: (body: { token: string; password: string }) => openApiClient.post("/auth/password-reset/confirm", body),
  session: () => openApiClient.get("/auth/session"),
  logout: () => openApiClient.post("/auth/logout"),
  setupTotp: () => openApiClient.post("/auth/2fa/totp/setup"),
  enableTotp: (body: { code: string }) => openApiClient.post("/auth/2fa/totp/enable", body),
  startEmailTwoFactor: () => openApiClient.post("/auth/2fa/email/start"),
  enableEmailTwoFactor: (body: { challengeId: string; code: string }) => openApiClient.post("/auth/2fa/email/enable", body),
  disableTwoFactor: () => openApiClient.post("/auth/2fa/disable"),
  updateOrderNotifications: (body: { enabled: boolean }) => openApiClient.post("/auth/preferences/order-notifications", body),
  inviteUser: (body: InviteUserRequest) => openApiClient.post("/auth/invite", body),
  users: () => openApiClient.get("/auth/users"),
  setUserActive: (id: string, body: { active: boolean }) => openApiClient.post("/auth/users/{id}/active", body, { params: { id } }),
  deleteUser: (id: string) => openApiClient.delete("/auth/users/{id}", { params: { id } }),
  articles: () => openApiClient.get("/catalog/articles"),
  locations: () => openApiClient.get("/catalog/locations"),
  templates: () => openApiClient.get("/catalog/templates"),
  createArticle: (body: CreateArticleRequest) => openApiClient.post("/catalog/articles", body),
  updateArticle: (id: string, body: UpdateArticleRequest) => openApiClient.patch("/catalog/articles/{id}", body, { params: { id } }),
  deleteArticle: (id: string) => openApiClient.delete("/catalog/articles/{id}", { params: { id } }),
  createLocation: (body: CreateLocationRequest) => openApiClient.post("/catalog/locations", body),
  updateLocation: (id: string, body: UpdateLocationRequest) => openApiClient.patch("/catalog/locations/{id}", body, { params: { id } }),
  deleteLocation: (id: string) => openApiClient.delete("/catalog/locations/{id}", { params: { id } }),
  createTemplate: (body: CreateTemplateRequest) => openApiClient.post("/catalog/templates", body),
  reviseTemplate: (id: string, body: ReviseTemplateRequest) => openApiClient.post("/catalog/templates/{id}/revise", body, { params: { id } }),
  deleteTemplate: (id: string) => openApiClient.delete("/catalog/templates/{id}", { params: { id } }),
  batches: () => openApiClient.get("/inventory/batches"),
  batchMovements: (id: string) => openApiClient.get("/inventory/batches/{id}/movements", { params: { id } }),
  createBatch: (body: CreateBatchRequest) => openApiClient.post("/inventory/batches", body),
  correctBatch: (id: string, body: BatchCorrectionRequest) => openApiClient.post("/inventory/batches/{id}/corrections", body, { params: { id } }),
  deleteBatch: (id: string) => openApiClient.delete("/inventory/batches/{id}", { params: { id } }),
  inventoryTargets: () => openApiClient.get("/inventory/targets"),
  upsertInventoryTarget: (articleId: string, locationId: string, body: UpsertInventoryTargetRequest) =>
    openApiClient.put("/inventory/targets/{articleId}/{locationId}", body, { params: { articleId, locationId } }),
  clearInventoryTarget: (articleId: string, locationId: string) =>
    openApiClient.delete("/inventory/targets/{articleId}/{locationId}", { params: { articleId, locationId } }),
  reconcileInventoryTargets: () => openApiClient.post("/inventory/targets/reconcile"),
  procurementOrders: () => openApiClient.get("/inventory/procurement-orders"),
  startProcurementOrder: (id: string) => openApiClient.post("/inventory/procurement-orders/{id}/start", { params: { id } }),
  receiveProcurementOrder: (id: string, body: ReceiveProcurementOrderRequest) =>
    openApiClient.post("/inventory/procurement-orders/{id}/receive", body, { params: { id } }),
  cancelProcurementOrder: (id: string) => openApiClient.post("/inventory/procurement-orders/{id}/cancel", { params: { id } }),
  inventoryAutomationConfig: () => openApiClient.get("/inventory/automation-config"),
  updateInventoryAutomationConfig: (body: UpdateInventoryAutomationConfigRequest) => openApiClient.post("/inventory/automation-config", body),
  kits: () => openApiClient.get("/catalog/kits"),
  createKit: (body: CreateKitRequest) => openApiClient.post("/catalog/kits", body),
  updateKit: (id: string, body: UpdateKitRequest) => openApiClient.patch("/catalog/kits/{id}", body, { params: { id } }),
  deleteKit: (id: string) => openApiClient.delete("/catalog/kits/{id}", { params: { id } }),
  orders: () => openApiClient.get("/replenishment-orders"),
  publicKit: (token: string) => openApiClient.get("/public/kits/{token}", { params: { token } }),
  rotateKitToken: (id: string) => openApiClient.post("/catalog/kits/{id}/rotate-token", { params: { id } }),
  completeCheck: (token: string, body: CompleteCheckRequest) =>
    openApiClient.post("/public/kits/{token}/checks", body, { params: { token } }),
  checkProtocols: (query: { q?: string; kitId?: string; status?: string; page?: string }) => openApiClient.get("/checks", { query }),
  checkProtocol: (id: string) => openApiClient.get("/checks/{id}", { params: { id } }),
  fulfillOrder: (id: string, body: FulfillOrderRequest) =>
    openApiClient.post("/replenishment-orders/{id}/fulfill", body, { params: { id } }),
  reportUrl
};
