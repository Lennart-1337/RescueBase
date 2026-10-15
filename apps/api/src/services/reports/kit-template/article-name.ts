export type ArticleNameMode = "short" | "full" | "both";

type ArticleNames = { name: string; shortName?: string | null };

export function templateArticleName(article: ArticleNames, mode: ArticleNameMode) {
  const shortName = article.shortName?.trim();
  if (mode === "full" || !shortName) return article.name;
  if (mode === "both" && shortName !== article.name.trim()) return `${shortName}\n${article.name}`;
  return shortName;
}
