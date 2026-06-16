export async function copyText(value: string, key: string, setCopiedValue: (value: string) => void) {
  try {
    await navigator.clipboard.writeText(value);
    setCopiedValue(key);
    window.setTimeout(() => setCopiedValue(""), 1500);
  } catch {
    setCopiedValue("");
  }
}
