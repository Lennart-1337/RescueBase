import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toOptionalString, withPrunedSearch } from "../../app/filter-utils";
import { toError } from "../../app/formatters";
import { ErrorPanel, LoadingPanel } from "../../components/state-panels";
import { rescueBaseApi } from "../../lib/api";
import { catalogKeys, catalogQueries } from "../../queries/catalog";
import { SupplierPanel } from "./supplier-panel";
import { buildSupplierSummaries, buildSupplierUpdate, normalizeSupplierName } from "./supplier-utils";

export function MasterDataSupplierPage({ filters }: { filters: { q: string } }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const articles = useQuery(catalogQueries.articles());
  const updateSupplier = useMutation({
    mutationFn: async ({ nextName, supplierName }: { nextName?: string; supplierName: string }) => {
      const linkedArticles = (articles.data ?? []).filter((entry) => normalizeSupplierName(entry.defaultSupplierName) === supplierName);
      await Promise.all(linkedArticles.map((entry) => rescueBaseApi.updateArticle(entry.id, buildSupplierUpdate(entry, nextName))));
    },
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: catalogKeys.articles() }),
  });

  if (articles.isLoading) return <LoadingPanel label="Lieferanten werden geladen" />;
  if (articles.isError || !articles.data) return <ErrorPanel error={toError(articles.error)} onRetry={() => void articles.refetch()} />;

  const suppliers = buildSupplierSummaries(articles.data, filters.q);

  function clearSupplier(supplierName: string) {
    if (window.confirm(`Lieferant "${supplierName}" wirklich aus allen verknüpften Artikeln entfernen?`)) {
      updateSupplier.mutate({ supplierName });
    }
  }

  return <SupplierPanel error={updateSupplier.error ? toError(updateSupplier.error) : null} filters={filters} isSubmitting={updateSupplier.isPending} onClear={clearSupplier} onFilterChange={(patch) => void navigate({ replace: true, search: withPrunedSearch({ q: toOptionalString(patch.q ?? filters.q) }), to: "/admin/master-data/suppliers" })} onRename={(supplierName, nextName) => updateSupplier.mutateAsync({ supplierName, nextName: nextName.trim() })} onResetFilters={() => void navigate({ replace: true, search: {}, to: "/admin/master-data/suppliers" })} suppliers={suppliers} totalCount={buildSupplierSummaries(articles.data, "").length} />;
}
