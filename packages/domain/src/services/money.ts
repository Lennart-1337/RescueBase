export function decimal(value: string): bigint {
  if (typeof value !== "string" || !/^\d{1,10}(\.\d{1,4})?$/.test(value)) {
    throw new Error(
      "Amounts require non-negative decimal strings with at most four decimal places.",
    );
  }
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole!) * 10000n + BigInt(fraction.padEnd(4, "0"));
}
export function money(cents: bigint): string {
  const sign = cents < 0n ? "-" : "";
  const absolute = cents < 0n ? -cents : cents;
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`;
}
export const roundCents = (scaled: bigint) => (scaled + 50n) / 100n;
