import { Button, Dialog, Field } from "../../../components/ui";
import type { Article } from "../../../lib/types";
import { SearchResults } from "./results";
import { useArticleSearch } from "./use-search";
import "./search.css";
export function ArticleSearch({
  articles,
  onSelect,
}: {
  articles: Article[];
  onSelect: (url: string, existingArticleId?: string) => void;
}) {
  const state = useArticleSearch();
  return (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={() => state.setOpen(true)}
      >
        Meier-Shop durchsuchen
      </Button>
      <Dialog
        open={state.open}
        onClose={state.close}
        size="wide"
        title="Meier-Shop durchsuchen"
        description="Produkt suchen, Daten im Artikelformular prüfen und anschließend speichern."
      >
        <form
          className="meier-search-form"
          onSubmit={(event) => {
            event.preventDefault();
            void state.search();
          }}
        >
          <Field label="Suchbegriff">
            <input
              type="search"
              value={state.query}
              onChange={(event) => state.changeQuery(event.target.value)}
              autoFocus
            />
          </Field>
          <Button type="submit" disabled={!state.valid} loading={state.loading}>
            Suchen
          </Button>
        </form>
        {state.loading ? (
          <p role="status">Meier-Produkte werden gesucht …</p>
        ) : null}
        {state.error ? (
          <div>
            <p role="alert">{state.error}</p>
            <Button
              type="button"
              variant="ghost"
              onClick={() => void state.retry()}
            >
              Erneut versuchen
            </Button>
          </div>
        ) : null}
        {state.result ? (
          <SearchResults
            result={state.result}
            articles={articles}
            onPage={(page) => void state.search(page, state.result!.query)}
            onSelect={(url, id) => {
              state.close();
              onSelect(url, id);
            }}
          />
        ) : null}
      </Dialog>
    </>
  );
}
