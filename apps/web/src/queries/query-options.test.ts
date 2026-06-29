import { describe, expect, it } from "vitest";
import { createRescueBaseQueryClient } from "../app/query-client";
import { alertKeys, alertQueries } from "./alerts";
import { authKeys, authQueries } from "./auth";
import { catalogKeys, catalogQueries } from "./catalog";
import { checkKeys, checkQueries } from "./checks";
import { deviceKeys } from "./devices";
import { inventoryKeys, inventoryQueries } from "./inventory";
import { orderKeys, orderQueries } from "./orders";
import { queryStaleTimes } from "./policies";
import { publicKeys } from "./public";
import { settingsKeys, settingsQueries } from "./settings";
import { userKeys } from "./users";

describe("query options", () => {
  it("uses stable domain query keys", () => {
    expect(authKeys.session()).toEqual(["auth", "session"]);
    expect(catalogKeys.locations()).toEqual(["catalog", "locations"]);
    expect(inventoryKeys.batchMovements("batch-1")).toEqual(["inventory", "batches", "batch-1", "movements"]);
    expect(orderKeys.purchaseDetail("po-1")).toEqual(["orders", "purchase", "po-1"]);
    expect(settingsKeys.admin()).toEqual(["settings", "admin"]);
    expect(checkKeys.protocols({ page: "2", q: "Mara" })).toEqual(["checks", "protocols", { page: "2", q: "Mara" }]);
    expect(alertKeys.subscriptionsMe()).toEqual(["alerts", "subscriptions", "me"]);
    expect(userKeys.list()).toEqual(["users", "list"]);
    expect(deviceKeys.list()).toEqual(["medical-devices", "list"]);
    expect(publicKeys.publicKit("token-1")).toEqual(["public", "kit", "token-1"]);
  });

  it("assigns explicit stale times by data volatility", () => {
    expect(catalogQueries.articles().staleTime).toBe(queryStaleTimes.reference);
    expect(authQueries.session().staleTime).toBe(queryStaleTimes.auth);
    expect(inventoryQueries.batches().staleTime).toBe(queryStaleTimes.live);
    expect(orderQueries.purchaseDetail("po-1").staleTime).toBe(queryStaleTimes.detail);
    expect(settingsQueries.admin().staleTime).toBe(queryStaleTimes.settings);
    expect(alertQueries.overview().staleTime).toBe(queryStaleTimes.live);
  });

  it("keeps global defaults conservative", () => {
    expect(createRescueBaseQueryClient().getDefaultOptions()).toMatchObject({
      queries: { retry: false },
      mutations: { retry: false }
    });
  });

  it("guards disabled detail queries", () => {
    expect(inventoryQueries.batchMovements(null, false).enabled).toBe(false);
    expect(checkQueries.detail("", false).enabled).toBe(false);
  });
});
