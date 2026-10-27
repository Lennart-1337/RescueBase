export function assertNumber(
  value: unknown,
  field: string,
  minimum = 0,
  integer = false,
): asserts value is number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < minimum ||
    (integer && !Number.isSafeInteger(value))
  ) {
    throw new Error(
      `${field} must be a finite ${integer ? "safe integer" : "number"} >= ${minimum}.`,
    );
  }
}
export function validateOptionalNumber(
  value: unknown,
  field: string,
  minimum = 0,
  integer = false,
): void {
  if (value !== undefined && value !== null)
    assertNumber(value, field, minimum, integer);
}
export function validateOptionalBoolean(value: unknown, field: string): void {
  if (value !== undefined && value !== null && typeof value !== "boolean") {
    throw new Error(`${field} must be a boolean.`);
  }
}
export function missingFields(
  input: object,
  fields: readonly string[],
): string[] {
  const values = input as Record<string, unknown>;
  return fields.filter(
    (field) => values[field] === undefined || values[field] === null,
  );
}
export function safeInteger(value: bigint): number {
  if (
    value > BigInt(Number.MAX_SAFE_INTEGER) ||
    value < BigInt(Number.MIN_SAFE_INTEGER)
  ) {
    throw new Error("Result exceeds the safe integer range.");
  }
  return Number(value);
}
