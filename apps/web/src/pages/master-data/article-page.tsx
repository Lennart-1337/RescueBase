import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { matchesFilterText, toOptionalBoolean, toOptionalString, withPrunedSearch } from "../../app/filter-utils";
import { toError } from "../../app/formatters";
import { ErrorPanel, LoadingPanel } from "../../components/state-panels";
import { rescueBaseApi } from "../../lib/api";
import { ArticlePanel } from "./article-panel";
import type { ReorderDirection } from "./reorder";
import { reorderVisibleIds } from "./reorder";
import type { ArticleFilters } from "./types";

export function MasterDataArticlePage({ filters }: { filters: ArticleFilters }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const articles = useQuery({ queryKey: ["articles"], queryFn: rescueBaseApi.articles });
  const createArticle = useMutation({ mutationFn: rescueBaseApi.createArticle, onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["articles"] }) });
  const updateArticle = useMutation({ mutationFn: ({ body, id }: Parameters<typeof rescueBaseApi.updateArticle> extends [infer I, infer B] ? { id: I & string; body: B } : never) => rescueBaseApi.updateArticle(id, body), onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["articles"] }) });
  const reorderArticles = useMutation({ mutationFn: rescueBaseApi.reorderArticles, onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["articles"] }) });
  const deleteArticle = useMutation({ mutationFn: rescueBaseApi.deleteArticle, onSuccess: async () => Promise.all([queryClient.invalidateQueries({ queryKey: ["articles"] }), queryClient.invalidateQueries({ queryKey: ["templates"] })]) });

  if (articles.isLoading) return <LoadingPanel label="Stammdaten werden geladen" />;
  if (articles.isError || !articles.data) return <ErrorPanel error={toError(articles.error)} onRetry={() => void articles.refetch()} />;

  const allArticles = articles.data;
  const filteredArticles = allArticles.filter((entry) => (!filters.category || entry.category === filters.category) && (!filters.medicalDevice || entry.medicalDevice) && (!filters.stkRequired || entry.stkRequired) && (!filters.mtkRequired || entry.mtkRequired) && (!filters.criticalDefault || entry.criticalDefault) && matchesFilterText(filters.q, entry.name, entry.manufacturer, entry.manufacturerPartNumber, entry.barcode));
  const mutationError = createArticle.error ?? updateArticle.error ?? reorderArticles.error ?? deleteArticle.error;

  function moveArticle(articleId: string, direction: ReorderDirection) {
    const articleIds = reorderVisibleIds(allArticles.map((entry) => entry.id).filter((id): id is string => Boolean(id)), filteredArticles.map((entry) => entry.id).filter((id): id is string => Boolean(id)), articleId, direction);
    return reorderArticles.mutateAsync({ articleIds });
  }

  return <ArticlePanel articles={filteredArticles} error={mutationError ? toError(mutationError) : null} filters={filters} isSubmitting={createArticle.isPending || updateArticle.isPending || reorderArticles.isPending || deleteArticle.isPending} onCreate={createArticle.mutateAsync} onDelete={deleteArticle.mutate} onFilterChange={(patch) => void navigate({ replace: true, search: withPrunedSearch({ category: toOptionalString(patch.category ?? filters.category), criticalDefault: toOptionalBoolean(patch.criticalDefault ?? filters.criticalDefault), medicalDevice: toOptionalBoolean(patch.medicalDevice ?? filters.medicalDevice), mtkRequired: toOptionalBoolean(patch.mtkRequired ?? filters.mtkRequired), q: toOptionalString(patch.q ?? filters.q), stkRequired: toOptionalBoolean(patch.stkRequired ?? filters.stkRequired) }), to: "/admin/master-data/articles" })} onMoveArticle={moveArticle} onResetFilters={() => void navigate({ replace: true, search: {}, to: "/admin/master-data/articles" })} onSave={(id, body) => updateArticle.mutateAsync({ id, body })} totalCount={allArticles.length} />;
}
