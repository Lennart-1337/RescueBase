import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "../../lib/openapi-client";
export async function mpgRequest<T>(path: string, body?: unknown, method = "POST"): Promise<T> {
  const response = await fetch(`/api/mpg${path}`, { credentials: "include", ...(body === undefined ? {} : { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) }) });
  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { message?: string | string[] };
    throw new ApiError(Array.isArray(error.message) ? error.message.join(" · ") : error.message ?? "Die Anfrage konnte nicht verarbeitet werden.", response.status);
  }
  return response.json() as Promise<T>;
}
export function useMpg<T>(path: string) { return useQuery({ queryKey: ["mpg", path], queryFn: () => mpgRequest<T>(path) }); }
export function useMpgAction() {
  const client = useQueryClient();
  return useMutation({ mutationFn: ({ path, body, method }: { path: string; body: unknown; method?: string }) => mpgRequest(path, body, method), onSuccess: async () => { await client.invalidateQueries({ queryKey: ["mpg"] }); } });
}

export async function uploadMpgDeviceDocument(deviceId: string, file: File): Promise<string> {
  if (file.size > 20 * 1024 * 1024) throw new Error("Die Datei darf höchstens 20 MB groß sein.");
  const body = new FormData();
  body.append("file", file);
  body.append("deviceId", deviceId);
  const response = await fetch("/api/mpg/documents", { method: "POST", credentials: "include", body });
  const result = await response.json() as { id?: string; message?: string };
  if (!response.ok || !result.id) throw new Error(result.message ?? "Prüfprotokoll konnte nicht hochgeladen werden.");
  return result.id;
}
