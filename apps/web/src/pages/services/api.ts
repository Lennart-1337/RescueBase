import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "../../lib/openapi-client";
import type { Catalog, Service } from "./types";
export async function serviceRequest<T>(
  path: string,
  body?: unknown,
  method?: string,
): Promise<T> {
  const response = await fetch(`/api/services${path}`, {
    credentials: "include",
    method: method ?? (body === undefined ? "GET" : "POST"),
    ...(body === undefined
      ? {}
      : {
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
  });
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as {
      message?: string | string[];
    };
    throw new ApiError(
      Array.isArray(error.message)
        ? error.message.join(" · ")
        : (error.message ?? "Die Anfrage konnte nicht verarbeitet werden."),
      response.status,
    );
  }
  return response.json() as Promise<T>;
}
export function useServices<T>(path: string) {
  return useQuery({
    queryKey: ["services", path],
    queryFn: () => serviceRequest<T>(path),
  });
}
export function useCatalog() {
  return useServices<Catalog>("/catalog");
}
export function useServiceAction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      path,
      body,
      method,
    }: {
      path: string;
      body: unknown;
      method?: string;
    }) => serviceRequest<Service>(path, body, method),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["services"] });
    },
  });
}
export async function uploadDocument(service: Service, file: File) {
  if (file.size > 20 * 1024 * 1024)
    throw new Error("Die Datei darf höchstens 20 MB groß sein.");
  const body = new FormData();
  body.append("file", file);
  body.append("version", String(service.version));
  const response = await fetch(`/api/services/${service.id}/documents`, {
    method: "POST",
    credentials: "include",
    body,
  });
  const result = (await response.json()) as { message?: string };
  if (!response.ok)
    throw new Error(
      result.message ?? "Das Dokument konnte nicht hochgeladen werden.",
    );
  return result;
}
