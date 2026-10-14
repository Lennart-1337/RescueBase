import { ListFilterBar } from "../../components/list-filter-bar";
import { PageToolbar } from "../../components/page-layout";
import { SearchableSelect } from "../../components/searchable-select";
import { CheckboxField, Field } from "../../components/ui";
import type { ArticlePanelProps } from "./article-panel-types";
export function ArticleFilters(
  props: Pick<
    ArticlePanelProps,
    "articles" | "filters" | "totalCount" | "onFilterChange" | "onResetFilters"
  >,
) {
  const categories = [
    ...new Set(
      props.articles
        .map((entry) => entry.category)
        .filter((entry): entry is string => Boolean(entry)),
    ),
  ].sort((left, right) => left.localeCompare(right, "de-DE"));
  return (
    <PageToolbar label="Artikel filtern">
      <ListFilterBar
        countLabel={`${props.articles.length}/${props.totalCount} sichtbar`}
        fieldsClassName="article-filter-grid"
        onReset={props.onResetFilters}
      >
        <Field label="Suche">
          <input
            onChange={(event) =>
              props.onFilterChange({ q: event.target.value })
            }
            placeholder="Name, Hersteller oder Barcode"
            value={props.filters.q}
          />
        </Field>
        <Field label="Kategorie">
          <SearchableSelect
            emptyLabel="Alle Kategorien"
            onChange={(value) => props.onFilterChange({ category: value })}
            options={[
              { label: "Alle Kategorien", value: "" },
              ...categories.map((category) => ({
                label: category,
                value: category,
              })),
            ]}
            value={props.filters.category}
          />
        </Field>
        <div aria-label="Artikelmerkmale" className="article-filter-checks">
          <CheckboxField
            compact
            checked={props.filters.medicalDevice}
            label="MPDG"
            onChange={(event) =>
              props.onFilterChange({ medicalDevice: event.target.checked })
            }
          />
          <CheckboxField
            compact
            checked={props.filters.stkRequired}
            label="STK"
            onChange={(event) =>
              props.onFilterChange({ stkRequired: event.target.checked })
            }
          />
          <CheckboxField
            compact
            checked={props.filters.mtkRequired}
            label="MTK"
            onChange={(event) =>
              props.onFilterChange({ mtkRequired: event.target.checked })
            }
          />
          <CheckboxField
            compact
            checked={props.filters.criticalDefault}
            label="Kritisch"
            onChange={(event) =>
              props.onFilterChange({ criticalDefault: event.target.checked })
            }
          />
        </div>
      </ListFilterBar>
    </PageToolbar>
  );
}
