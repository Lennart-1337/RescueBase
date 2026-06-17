import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toError } from "../../app/formatters";
import { ErrorPanel, LoadingPanel } from "../../components/state-panels";
import { rescueBaseApi } from "../../lib/api";
import { TemplatePanel } from "./template-panel";

export function MasterDataTemplatePage() {
  const queryClient = useQueryClient();
  const articles = useQuery({ queryKey: ["articles"], queryFn: rescueBaseApi.articles });
  const templates = useQuery({ queryKey: ["templates"], queryFn: rescueBaseApi.templates });
  const createTemplate = useMutation({ mutationFn: rescueBaseApi.createTemplate, onSuccess: async () => Promise.all([queryClient.invalidateQueries({ queryKey: ["templates"] }), queryClient.invalidateQueries({ queryKey: ["kits"] })]) });
  const reviseTemplate = useMutation({ mutationFn: ({ body, id }: Parameters<typeof rescueBaseApi.reviseTemplate> extends [infer I, infer B] ? { id: I & string; body: B } : never) => rescueBaseApi.reviseTemplate(id, body), onSuccess: async () => Promise.all([queryClient.invalidateQueries({ queryKey: ["templates"] }), queryClient.invalidateQueries({ queryKey: ["kits"] })]) });
  const deleteTemplate = useMutation({ mutationFn: rescueBaseApi.deleteTemplate, onSuccess: async () => Promise.all([queryClient.invalidateQueries({ queryKey: ["templates"] }), queryClient.invalidateQueries({ queryKey: ["kits"] })]) });

  if (articles.isLoading || templates.isLoading) return <LoadingPanel label="Vorlagen werden geladen" />;
  if (articles.isError || templates.isError || !articles.data || !templates.data) return <ErrorPanel error={toError(articles.error ?? templates.error)} onRetry={() => void Promise.all([articles.refetch(), templates.refetch()])} />;

  return <TemplatePanel articles={articles.data} error={createTemplate.error || reviseTemplate.error || deleteTemplate.error ? toError(createTemplate.error ?? reviseTemplate.error ?? deleteTemplate.error) : null} isSubmitting={createTemplate.isPending || reviseTemplate.isPending || deleteTemplate.isPending} onCreate={createTemplate.mutateAsync} onDelete={deleteTemplate.mutate} onRevise={(id, body) => reviseTemplate.mutateAsync({ id, body })} templates={templates.data} />;
}
