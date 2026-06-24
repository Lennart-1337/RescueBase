export type AppBranding = {
  appName: string;
  appSubtitle: string;
};

export function getBrandMark(appName?: string | null): string {
  const words = (appName ?? "")
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^0-9A-Za-zÄÖÜäöüß]/g, ""))
    .filter(Boolean);

  if (words.length >= 2) {
    return `${words[0]?.charAt(0) ?? ""}${words[1]?.charAt(0) ?? ""}`.toUpperCase();
  }

  if (words.length === 1) {
    return (words[0]?.slice(0, 2) ?? "").toUpperCase();
  }

  return "RB";
}
