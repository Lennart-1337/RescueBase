import { ApiError } from "./openapi-client";

export type AlertCategory = "EXPIRY" | "STK_DUE" | "MTK_DUE" | "SHORTAGE";

export type AlertWarning = {
  id: string;
  category: AlertCategory;
  sourceType: string;
  sourceId: string;
  locationId: string | null;
  locationName: string | null;
  title: string;
  details: string;
  dueAt: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  metadata?: Record<string, unknown> | null;
};

export type AlertSubscription = {
  id: string;
  userId: string;
  category: AlertCategory;
  locationId: string | null;
  locationName: string | null;
  user: { id: string; email: string; displayName: string };
};

export type MedicalDevice = {
  id: string;
  name: string;
  articleId: string;
  locationId: string;
  kitId: string | null;
  serialNumber: string | null;
  inventoryNumber: string | null;
  lastStkAt: string | null;
  lastMtkAt: string | null;
  stkIntervalMonths: number | null;
  mtkIntervalMonths: number | null;
  active: boolean;
  notes: string | null;
  article: { id: string; name: string; stkRequired: boolean; mtkRequired: boolean; stkIntervalMonths: number | null; mtkIntervalMonths: number | null };
  location: { id: string; name: string };
  kit: null | { id: string; name: string; code: string; locationId: string; locationName: string };
};

export async function getAlertOverview() {
  return requestJson<{ generatedAt: string; warnings: AlertWarning[]; summary: { expiry: number; stkDue: number; mtkDue: number; shortage: number } }>("/alerts/warnings");
}

export async function getMyAlertSubscriptions() {
  return requestJson<AlertSubscription[]>("/alerts/subscriptions/me");
}

export async function saveMyAlertSubscriptions(subscriptions: Array<{ category: AlertCategory; locationId?: string | null }>) {
  return requestJson<AlertSubscription[]>("/alerts/subscriptions/me", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ subscriptions })
  });
}

export async function getAlertSubscriptions() {
  return requestJson<AlertSubscription[]>("/alerts/subscriptions");
}

export async function listMedicalDevices() {
  return requestJson<MedicalDevice[]>("/catalog/devices");
}

export async function createMedicalDevice(body: MedicalDeviceWriteBody) {
  return requestJson<MedicalDevice>("/catalog/devices", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

export async function updateMedicalDevice(id: string, body: MedicalDeviceWriteBody) {
  return requestJson<MedicalDevice>(`/catalog/devices/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

export async function deleteMedicalDevice(id: string) {
  return requestJson<{ ok: true }>(`/catalog/devices/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export type MedicalDeviceWriteBody = {
  name: string;
  articleId: string;
  locationId?: string;
  kitId?: string;
  serialNumber?: string;
  inventoryNumber?: string;
  lastStkAt?: string | null;
  lastMtkAt?: string | null;
  stkIntervalMonths?: number | null;
  mtkIntervalMonths?: number | null;
  active?: boolean;
  notes?: string;
};

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      credentials: "include",
      ...init,
      headers: {
        ...init?.headers
      }
    });
  } catch {
    throw new ApiError("Die RescueBase-API ist nicht erreichbar.");
  }

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  return (await response.json()) as T;
}

async function readErrorMessage(response: Response): Promise<string> {
  const fallback = `API-Anfrage fehlgeschlagen (${response.status}).`;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return fallback;
  }
  const body = (await response.json().catch(() => undefined)) as { message?: unknown } | undefined;
  return typeof body?.message === "string" ? body.message : fallback;
}
