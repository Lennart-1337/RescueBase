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
