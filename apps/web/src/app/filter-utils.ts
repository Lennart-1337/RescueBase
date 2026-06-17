export function matchesFilterText(query: string, ...values: Array<string | null | undefined>) {
  const normalizedQuery = normalizeFilterText(query);
  if (!normalizedQuery) return true;
  return values.some((value) => normalizeFilterText(value).includes(normalizedQuery));
}

export function normalizeFilterText(value: string | null | undefined) {
  return (value ?? "").trim().toLocaleLowerCase("de-DE");
}

export function readBooleanSearch(value: unknown) {
  return value === true || value === "true";
}

export function readStringSearch(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function toOptionalBoolean(value: boolean): true | undefined {
  return value ? true : undefined;
}

export function toOptionalString(value: string) {
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

export function withPrunedSearch<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== "" && entry !== false)
  ) as T;
}
