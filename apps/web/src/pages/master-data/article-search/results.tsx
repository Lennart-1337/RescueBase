import { Button } from "../../../components/ui";
import type { Article } from "../../../lib/types";
import type { MeierSearchResult } from "../../../lib/article-search";
import { matchingArticles } from "./duplicates";
export function SearchResults({
  result,
  articles,
  onSelect,
  onPage,
}: {
  result: MeierSearchResult;
  articles: Article[];
  onSelect: (url: string, existingArticleId?: string) => void;
  onPage: (page: number) => void;
}) {
  return (
    <>
      {result.warnings?.map((warning) => (
        <p key={warning} role="status">
          {warning}
        </p>
      ))}
      {!result.items.length ? (
        <p role="status">
          {result.totalPages > 1
            ? "Auf dieser Seite wurden keine passenden Produkte gefunden. Bitte weitere Seiten prüfen oder den Suchbegriff anpassen."
            : "Keine passenden Produkte gefunden. Bitte einen anderen Suchbegriff versuchen."}
        </p>
      ) : null}
      <ul className="meier-search-results">
        {result.items.map((item) => {
          const existing = matchingArticles(articles, item);
          return (
            <li key={item.url}>
              <div>
                <h3>{item.name}</h3>
                <p>
                  {[
                    item.manufacturer,
                    item.supplierArticleNumber &&
                      `Art.-Nr. ${item.supplierArticleNumber}`,
                    item.priceLabel,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <a href={item.url} target="_blank" rel="noreferrer">
                  Im Meier-Shop ansehen
                </a>
                {existing.length ? (
                  <p>
                    {existing.length > 1
                      ? "Mehrfach vorhanden – bitte zuerst die vorhandenen Artikel prüfen."
                      : "Bereits vorhanden"}
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={existing.length > 1}
                onClick={() => onSelect(item.url, existing[0]?.id)}
              >
                {existing.length
                  ? "Vorhandenen Artikel prüfen"
                  : "Daten prüfen"}
              </Button>
            </li>
          );
        })}
      </ul>
      {result.totalPages > 1 ? (
        <nav
          className="meier-search-pagination"
          aria-label="Suchergebnisseiten"
        >
          <Button
            type="button"
            variant="ghost"
            disabled={result.page <= 1}
            onClick={() => onPage(result.page - 1)}
          >
            Vorherige Seite
          </Button>
          <span>
            Seite {result.page} von {result.totalPages}
          </span>
          <Button
            type="button"
            variant="ghost"
            disabled={result.page >= result.totalPages}
            onClick={() => onPage(result.page + 1)}
          >
            Nächste Seite
          </Button>
        </nav>
      ) : null}
    </>
  );
}
