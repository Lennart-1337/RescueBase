import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toOptionalString, withPrunedSearch } from "../../app/filter-utils";
import { toError } from "../../app/formatters";
import { ErrorPanel, LoadingPanel } from "../../components/state-panels";
import { rescueBaseApi } from "../../lib/api";
import type { CreateSupplierRequest, UpdateSupplierRequest } from "../../lib/types";
import { catalogKeys, catalogQueries } from "../../queries/catalog";
import { SupplierPanel } from "./supplier-panel";
import { buildSupplierSummaries, type SupplierSummary } from "./supplier-utils";

export function MasterDataSupplierPage({ filters }: { filters: { q: string } }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const suppliers = useQuery(catalogQueries.suppliers());
  const articles = useQuery(catalogQueries.articles());
  const createSupplier = useMutation({ mutationFn: (body: CreateSupplierRequest) => rescueBaseApi.createSupplier(body), onSuccess: async () => queryClient.invalidateQueries({ queryKey: catalogKeys.suppliers() }) });
  const updateSupplier = useMutation({ mutationFn: ({ body, id }: { body: UpdateSupplierRequest; id: string }) => rescueBaseApi.updateSupplier(id, body), onSuccess: async () => Promise.all([queryClient.invalidateQueries({ queryKey: catalogKeys.suppliers() }), queryClient.invalidateQueries({ queryKey: catalogKeys.articles() })]) });
  const deleteSupplier = useMutation({ mutationFn: rescueBaseApi.deleteSupplier, onSuccess: async () => Promise.all([queryClient.invalidateQueries({ queryKey: catalogKeys.suppliers() }), queryClient.invalidateQueries({ queryKey: catalogKeys.articles() })]) });

  if (suppliers.isLoading || articles.isLoading) return <LoadingPanel label="Lieferanten werden geladen" />;
  if (suppliers.isError || articles.isError || !suppliers.data || !articles.data) return <ErrorPanel error={toError(suppliers.error ?? articles.error)} onRetry={() => void Promise.all([suppliers.refetch(), articles.refetch()])} />;

  const entries = buildSupplierSummaries(suppliers.data, articles.data, filters.q);
  const mutationError = createSupplier.error ?? updateSupplier.error ?? deleteSupplier.error;

  function confirmDelete(supplier: SupplierSummary) {
    if (window.confirm(`Lieferant "${supplier.name}" wirklich löschen?`)) {
      deleteSupplier.mutate(supplier.id);
    }
  }

  return <SupplierPanel error={mutationError ? toError(mutationError) : null} filters={filters} isSubmitting={createSupplier.isPending || updateSupplier.isPending || deleteSupplier.isPending} onCreate={createSupplier.mutateAsync} onDelete={confirmDelete} onFilterChange={(patch) => void navigate({ replace: true, search: withPrunedSearch({ q: toOptionalString(patch.q ?? filters.q) }), to: "/admin/master-data/suppliers" })} onResetFilters={() => void navigate({ replace: true, search: {}, to: "/admin/master-data/suppliers" })} onSave={(id, body) => updateSupplier.mutateAsync({ id, body })} suppliers={entries} totalCount={buildSupplierSummaries(suppliers.data, articles.data, "").length} />;
}
