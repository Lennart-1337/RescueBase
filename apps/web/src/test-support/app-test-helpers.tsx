import { act, cleanup, fireEvent, render } from "@testing-library/react";
import App, { createAppMemoryRouter } from "../App";
import { installFetchInterceptor, setFetchHandler } from "../test/setup";

let activeRouter: ReturnType<typeof createAppMemoryRouter> | undefined;
let fetchCalls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];

export function getActiveRouter() {
  return activeRouter;
}

export function resetTestBrowser() {
  cleanup();
  activeRouter = undefined;
  fetchCalls = [];
  vi.restoreAllMocks();
  installFetchInterceptor();
  setFetchHandler();
  window.localStorage.clear();
  window.sessionStorage.clear();
  history.pushState({}, "", "/");
}

export function stubFetch(routes: Record<string, unknown>) {
  setFetchHandler(vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    fetchCalls.push([input, init]);
    const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
    const pathname = new URL(url, "http://localhost").pathname;
    if (pathname === "/api/auth/get-session" && routes["/api/auth/session"]) {
      return new Response(JSON.stringify(toBetterAuthSession(routes["/api/auth/session"])), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (!(pathname in routes)) {
      return new Response(JSON.stringify({ message: `No test route for ${pathname}` }), { status: 404, headers: { "content-type": "application/json" } });
    }
    return new Response(JSON.stringify(routes[pathname]), { status: 200, headers: { "content-type": "application/json" } });
  }));
}

function toBetterAuthSession(value: unknown) {
  if (!value || typeof value !== "object" || !("user" in value)) return value;
  const session = value as { user?: Record<string, unknown> };
  return {
    ...session,
    user: {
      ...session.user,
      name: session.user?.name ?? session.user?.displayName
    }
  };
}

export function postedBody(pathname: string) {
  return requestBody(pathname, "POST");
}

export function requestBody(pathname: string, method: string) {
  const call = fetchCalls.find(([input, init]) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
    const path = new URL(url, "http://localhost").pathname;
    return path === pathname && (init?.method ?? "GET") === method;
  });
  return call?.[1]?.body ? JSON.parse(String(call[1].body)) : undefined;
}

export function wasRequested(pathname: string, method: string) {
  return fetchCalls.some(([input, init]) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
    const path = new URL(url, "http://localhost").pathname;
    return path === pathname && (init?.method ?? "GET") === method;
  });
}

export async function renderAppAt(pathname: string) {
  cleanup();
  history.pushState({}, "", pathname);
  activeRouter = createAppMemoryRouter(pathname);
  await act(async () => {
    await activeRouter?.load();
    render(<App router={activeRouter} />);
    await flushUi();
  });
}

export async function clickElement(element: HTMLElement) {
  await act(async () => {
    fireEvent.click(element);
    await flushUi();
  });
}

export async function mouseDownElement(element: HTMLElement) {
  await act(async () => {
    fireEvent.mouseDown(element);
    await flushUi();
  });
}

export async function changeValue(element: HTMLElement, value: string) {
  await act(async () => {
    fireEvent.change(element, { target: { value } });
    await flushUi();
  });
}

async function flushUi() {
  await Promise.resolve();
}
