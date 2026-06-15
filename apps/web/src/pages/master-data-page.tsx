import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { rescueBaseApi } from "../lib/api";
import type { AuthenticatedUser } from "../lib/types";
import { ErrorPanel, LoadingPanel } from "../components/state-panels";
import { Tabs } from "../components/ui";
import { toError } from "../app/formatters";
import { ArticlePanel } from "./master-data/article-panel";
import { LocationPanel } from "./master-data/location-panel";
import { TemplatePanel } from "./master-data/template-panel";

export function MasterDataPage({ user }: { user: AuthenticatedUser }) {
  const [activeTab, setActiveTab] = useState<"articles" | "locations" | "templates">("articles");
  const queryClient = useQueryClient();
  const articles = useQuery({ queryKey: ["articles"], queryFn: rescueBaseApi.articles });
  const locations = useQuery({ queryKey: ["locations"], queryFn: rescueBaseApi.locations });
  const templates = useQuery({ queryKey: ["templates"], queryFn: rescueBaseApi.templates });
  const createArticle = useMutation({ mutationFn: rescueBaseApi.createArticle, onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["articles"] }) });
  const createLocation = useMutation({ mutationFn: rescueBaseApi.createLocation, onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["locations"] }) });
  const createTemplate = useMutation({
    mutationFn: rescueBaseApi.createTemplate,
    onSuccess: async () => Promise.all([queryClient.invalidateQueries({ queryKey: ["templates"] }), queryClient.invalidateQueries({ queryKey: ["kits"] })])
  });
  const updateArticle = useMutation({
    mutationFn: ({ body, id }: Parameters<typeof rescueBaseApi.updateArticle> extends [infer I, infer B] ? { id: I & string; body: B } : never) =>
      rescueBaseApi.updateArticle(id, body),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["articles"] })
  });
  const updateLocation = useMutation({
    mutationFn: ({ body, id }: Parameters<typeof rescueBaseApi.updateLocation> extends [infer I, infer B] ? { id: I & string; body: B } : never) =>
      rescueBaseApi.updateLocation(id, body),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["locations"] })
  });
  const reviseTemplate = useMutation({
    mutationFn: ({ body, id }: Parameters<typeof rescueBaseApi.reviseTemplate> extends [infer I, infer B] ? { id: I & string; body: B } : never) =>
      rescueBaseApi.reviseTemplate(id, body),
    onSuccess: async () => Promise.all([queryClient.invalidateQueries({ queryKey: ["templates"] }), queryClient.invalidateQueries({ queryKey: ["kits"] })])
  });

  if (user.role !== "ADMIN") {
    return <ErrorPanel error={new Error("Für Stammdaten ist eine Admin-Rolle erforderlich.")} onRetry={() => undefined} />;
  }
  if (articles.isLoading || locations.isLoading || templates.isLoading) {
    return <LoadingPanel label="Stammdaten werden geladen" />;
  }
  if (articles.isError || locations.isError || templates.isError || !articles.data || !locations.data || !templates.data) {
    return <ErrorPanel error={toError(articles.error ?? locations.error ?? templates.error)} onRetry={() => void Promise.all([articles.refetch(), locations.refetch(), templates.refetch()])} />;
  }

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Stammdaten</h1>
          <p>Artikel, Lagerorte und versionierte Rucksackvorlagen.</p>
        </div>
      </header>
      <Tabs
        items={[{ label: "Artikel", value: "articles" }, { label: "Lagerorte", value: "locations" }, { label: "Rucksackvorlagen", value: "templates" }]}
        label="Stammdatenbereiche"
        onChange={(value) => setActiveTab(value as "articles" | "locations" | "templates")}
        value={activeTab}
      />
      {activeTab === "articles" ? <ArticlePanel articles={articles.data} error={createArticle.error || updateArticle.error ? toError(createArticle.error ?? updateArticle.error) : null} isSubmitting={createArticle.isPending || updateArticle.isPending} onCreate={createArticle.mutateAsync} onSave={(id, body) => updateArticle.mutateAsync({ id, body })} /> : null}
      {activeTab === "locations" ? <LocationPanel error={createLocation.error || updateLocation.error ? toError(createLocation.error ?? updateLocation.error) : null} isSubmitting={createLocation.isPending || updateLocation.isPending} locations={locations.data} onCreate={createLocation.mutateAsync} onSave={(id, body) => updateLocation.mutateAsync({ id, body })} /> : null}
      {activeTab === "templates" ? <TemplatePanel articles={articles.data} error={createTemplate.error || reviseTemplate.error ? toError(createTemplate.error ?? reviseTemplate.error) : null} isSubmitting={createTemplate.isPending || reviseTemplate.isPending} onCreate={createTemplate.mutateAsync} onRevise={(id, body) => reviseTemplate.mutateAsync({ id, body })} templates={templates.data} /> : null}
    </>
  );
}
