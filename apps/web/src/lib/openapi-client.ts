import type { paths } from "./generated-api";

const apiBase = "/api";
const json = "application/json";

type HttpMethod = "get" | "post" | "patch";
type PathFor<Method extends HttpMethod> = {
  [Path in keyof paths]: paths[Path][Method] extends never | undefined ? never : Path
}[keyof paths];
type Operation<Path extends keyof paths, Method extends HttpMethod> = NonNullable<paths[Path][Method]>;
type PathParameters<OperationType> = OperationType extends { parameters: { path: infer Parameters } } ? Parameters : never;
type RequestBody<OperationType> = OperationType extends { requestBody: { content: { "application/json": infer Body } } } ? Body : never;
type JsonResponse<OperationType> =
  OperationType extends { responses: { 200: { content: { "application/json": infer Response } } } } ? Response :
    OperationType extends { responses: { 201: { content: { "application/json": infer Response } } } } ? Response :
      never;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const openApiClient = {
  get<Path extends PathFor<"get">>(
    path: Path,
    options?: PathParameters<Operation<Path, "get">> extends never ? undefined : { params: PathParameters<Operation<Path, "get">> }
  ): Promise<JsonResponse<Operation<Path, "get">>> {
    return requestJson(buildPath(path, options?.params));
  },

  post<Path extends PathFor<"post">>(
    path: Path,
    ...args: RequestBody<Operation<Path, "post">> extends never
      ? [options?: PathParameters<Operation<Path, "post">> extends never ? undefined : { params: PathParameters<Operation<Path, "post">> }]
      : [body: RequestBody<Operation<Path, "post">>, options?: PathParameters<Operation<Path, "post">> extends never ? undefined : { params: PathParameters<Operation<Path, "post">> }]
  ): Promise<JsonResponse<Operation<Path, "post">>> {
    const body = args.length > 0 && !looksLikeOptions(args[0]) ? args[0] : undefined;
    const options = (body === undefined ? args[0] : args[1]) as { params?: Record<string, string> } | undefined;
    return requestJson(buildPath(path, options?.params), {
      method: "POST",
      headers: { "content-type": json },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  },

  patch<Path extends PathFor<"patch">>(
    path: Path,
    ...args: RequestBody<Operation<Path, "patch">> extends never
      ? [options?: PathParameters<Operation<Path, "patch">> extends never ? undefined : { params: PathParameters<Operation<Path, "patch">> }]
      : [body: RequestBody<Operation<Path, "patch">>, options?: PathParameters<Operation<Path, "patch">> extends never ? undefined : { params: PathParameters<Operation<Path, "patch">> }]
  ): Promise<JsonResponse<Operation<Path, "patch">>> {
    const body = args.length > 0 && !looksLikeOptions(args[0]) ? args[0] : undefined;
    const options = (body === undefined ? args[0] : args[1]) as { params?: Record<string, string> } | undefined;
    return requestJson(buildPath(path, options?.params), {
      method: "PATCH",
      headers: { "content-type": json },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  }
};

export function reportUrl(path: string): string {
  return `${apiBase}${path}`;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBase}${path}`, {
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

function buildPath(path: string, params?: Record<string, string>): string {
  if (!params) {
    return path;
  }
  return Object.entries(params).reduce(
    (current, [key, value]) => current.replace(`{${key}}`, encodeURIComponent(value)),
    path
  );
}

function looksLikeOptions(value: unknown): value is { params?: Record<string, string> } {
  return typeof value === "object" && value !== null && "params" in value;
}

async function readErrorMessage(response: Response): Promise<string> {
  const fallback = `API-Anfrage fehlgeschlagen (${response.status}).`;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes(json)) {
    return fallback;
  }

  const body = (await response.json().catch(() => undefined)) as { message?: unknown } | undefined;
  return typeof body?.message === "string" ? body.message : fallback;
}
