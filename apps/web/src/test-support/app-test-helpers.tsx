import { act, fireEvent, render } from "@testing-library/react";
import App, { createAppMemoryRouter } from "../App";

let activeRouter: ReturnType<typeof createAppMemoryRouter> | undefined;

export function getActiveRouter() {
  return activeRouter;
}

export function resetTestBrowser() {
  activeRouter = undefined;
  vi.restoreAllMocks();
  history.pushState({}, "", "/");
}

export function stubFetch(routes: Record<string, unknown>) {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
    const pathname = url.startsWith("http") ? new URL(url).pathname : url;
    if (!(pathname in routes)) {
      return new Response(JSON.stringify({ message: `No test route for ${pathname}` }), { status: 404, headers: { "content-type": "application/json" } });
    }
    return new Response(JSON.stringify(routes[pathname]), { status: 200, headers: { "content-type": "application/json" } });
  }));
}

export function postedBody(pathname: string) {
  return requestBody(pathname, "POST");
}

export function requestBody(pathname: string, method: string) {
  const calls = (fetch as unknown as { mock: { calls: Array<[RequestInfo | URL, RequestInit | undefined]> } }).mock.calls;
  const call = calls.find(([input, init]) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
    const path = url.startsWith("http") ? new URL(url).pathname : url;
    return path === pathname && (init?.method ?? "GET") === method;
  });
  return call?.[1]?.body ? JSON.parse(String(call[1].body)) : undefined;
}

export function wasRequested(pathname: string, method: string) {
  const calls = (fetch as unknown as { mock: { calls: Array<[RequestInfo | URL, RequestInit | undefined]> } }).mock.calls;
  return calls.some(([input, init]) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
    const path = url.startsWith("http") ? new URL(url).pathname : url;
    return path === pathname && (init?.method ?? "GET") === method;
  });
}

export async function renderAppAt(pathname: string) {
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

export async function changeValue(element: HTMLElement, value: string) {
  await act(async () => {
    fireEvent.change(element, { target: { value } });
    await flushUi();
  });
}

async function flushUi() {
  await Promise.resolve();
}
