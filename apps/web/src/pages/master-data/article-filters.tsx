import { ListFilterBar } from "../../components/list-filter-bar";
import { PageToolbar } from "../../components/page-layout";
import { Field } from "../../components/ui";
import type { ArticlePanelProps } from "./article-panel-types";
import { ActiveFilters } from "./article-filter-controls/active-filters";
import { AdvancedFilters } from "./article-filter-controls/advanced-filters";
import { MultiFilter } from "./article-filter-controls/multi-filter";
import { arrayValue, articleOptions } from "./article-filter-controls/options";
import "./article-filter-controls/filters.css";
export function ArticleFilters(props: Pick<ArticlePanelProps,
  "articles" | "allArticles" | "suppliers" | "filters" | "totalCount" | "onFilterChange" | "onResetFilters"
>) {
  const options = articleOptions(props.allArticles ?? props.articles, props.suppliers);
  return <PageToolbar label="Artikel filtern">
    <ListFilterBar countLabel={`${props.articles.length}/${props.totalCount} sichtbar`}
      fieldsClassName="article-filter-grid" onReset={props.onResetFilters}>
      <Field label="Suche"><input onChange={(event) => props.onFilterChange({ q: event.target.value })}
        placeholder="Name, Hersteller oder Barcode" value={props.filters.q} /></Field>
      <MultiFilter label="Kategorie" emptyLabel="Alle Kategorien" options={options.category}
        value={arrayValue(props.filters.category)} onChange={(category) => props.onFilterChange({ category })} />
      <MultiFilter label="Hersteller" emptyLabel="Alle Hersteller" options={options.manufacturer}
        value={props.filters.manufacturer ?? []} onChange={(manufacturer) => props.onFilterChange({ manufacturer })} />
      <MultiFilter label="Standard-Lieferant" emptyLabel="Alle Lieferanten" options={options.supplier}
        value={props.filters.supplier ?? []} onChange={(supplier) => props.onFilterChange({ supplier })} />
      <AdvancedFilters filters={props.filters} onChange={props.onFilterChange} units={options.unit} />
      <ActiveFilters filters={props.filters} onChange={props.onFilterChange} options={options} />
    </ListFilterBar>
  </PageToolbar>;
}
