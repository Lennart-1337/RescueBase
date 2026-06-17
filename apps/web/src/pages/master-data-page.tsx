import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { rescueBaseApi } from "../lib/api";
import type { AuthenticatedUser } from "../lib/types";
import { ErrorPanel, LoadingPanel } from "../components/state-panels";
import { Tabs } from "../components/ui";
import { toError } from "../app/formatters";
import { ArticlePanel } from "./master-data/article-panel";
import { DevicePanel } from "./master-data/device-panel";
import { LocationPanel } from "./master-data/location-panel";
import { TemplatePanel } from "./master-data/template-panel";
import { createMedicalDevice, listMedicalDevices, updateMedicalDevice } from "../lib/extra-api";

export function MasterDataPage({ user }: { user: AuthenticatedUser }) {
  const [activeTab, setActiveTab] = useState<"articles" | "locations" | "templates" | "devices">("articles");
  const queryClient = useQueryClient();
  const articles = useQuery({ queryKey: ["articles"], queryFn: rescueBaseApi.articles });
  const locations = useQuery({ queryKey: ["locations"], queryFn: rescueBaseApi.locations });
  const templates = useQuery({ queryKey: ["templates"], queryFn: rescueBaseApi.templates });
  const devices = useQuery({ queryKey: ["medical-devices"], queryFn: listMedicalDevices });
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
  const deleteArticle = useMutation({
    mutationFn: rescueBaseApi.deleteArticle,
    onSuccess: async () => Promise.all([queryClient.invalidateQueries({ queryKey: ["articles"] }), queryClient.invalidateQueries({ queryKey: ["templates"] })])
  });
  const deleteLocation = useMutation({
    mutationFn: rescueBaseApi.deleteLocation,
    onSuccess: async () => Promise.all([queryClient.invalidateQueries({ queryKey: ["locations"] }), queryClient.invalidateQueries({ queryKey: ["kits"] }), queryClient.invalidateQueries({ queryKey: ["batches"] })])
  });
  const deleteTemplate = useMutation({
    mutationFn: rescueBaseApi.deleteTemplate,
    onSuccess: async () => Promise.all([queryClient.invalidateQueries({ queryKey: ["templates"] }), queryClient.invalidateQueries({ queryKey: ["kits"] })])
  });
  const createDevice = useMutation({ mutationFn: createMedicalDevice, onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["medical-devices"] }) });
  const updateDevice = useMutation({ mutationFn: ({ body, id }: { id: string; body: Parameters<typeof updateMedicalDevice>[1] }) => updateMedicalDevice(id, body), onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["medical-devices"] }) });

  if (user.role !== "ADMIN") {
    return <ErrorPanel error={new Error("Für Stammdaten ist eine Admin-Rolle erforderlich.")} onRetry={() => undefined} />;
  }
  if (articles.isLoading || locations.isLoading || templates.isLoading) {
    return <LoadingPanel label="Stammdaten werden geladen" />;
  }
  if (articles.isError || locations.isError || templates.isError || devices.isError || !articles.data || !locations.data || !templates.data || !devices.data) {
    return <ErrorPanel error={toError(articles.error ?? locations.error ?? templates.error ?? devices.error)} onRetry={() => void Promise.all([articles.refetch(), locations.refetch(), templates.refetch(), devices.refetch()])} />;
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
        items={[{ label: "Artikel", value: "articles" }, { label: "Lagerorte", value: "locations" }, { label: "Rucksackvorlagen", value: "templates" }, { label: "Geräte", value: "devices" }]}
        label="Stammdatenbereiche"
        onChange={(value) => setActiveTab(value as "articles" | "locations" | "templates" | "devices")}
        value={activeTab}
      />
      {activeTab === "articles" ? <ArticlePanel articles={articles.data} error={createArticle.error || updateArticle.error || deleteArticle.error ? toError(createArticle.error ?? updateArticle.error ?? deleteArticle.error) : null} isSubmitting={createArticle.isPending || updateArticle.isPending || deleteArticle.isPending} onCreate={createArticle.mutateAsync} onDelete={deleteArticle.mutate} onSave={(id, body) => updateArticle.mutateAsync({ id, body })} /> : null}
      {activeTab === "locations" ? <LocationPanel error={createLocation.error || updateLocation.error || deleteLocation.error ? toError(createLocation.error ?? updateLocation.error ?? deleteLocation.error) : null} isSubmitting={createLocation.isPending || updateLocation.isPending || deleteLocation.isPending} locations={locations.data} onCreate={createLocation.mutateAsync} onDelete={deleteLocation.mutate} onSave={(id, body) => updateLocation.mutateAsync({ id, body })} /> : null}
      {activeTab === "templates" ? <TemplatePanel articles={articles.data} error={createTemplate.error || reviseTemplate.error || deleteTemplate.error ? toError(createTemplate.error ?? reviseTemplate.error ?? deleteTemplate.error) : null} isSubmitting={createTemplate.isPending || reviseTemplate.isPending || deleteTemplate.isPending} onCreate={createTemplate.mutateAsync} onDelete={deleteTemplate.mutate} onRevise={(id, body) => reviseTemplate.mutateAsync({ id, body })} templates={templates.data} /> : null}
      {activeTab === "devices" ? <DevicePanel articles={articles.data} devices={devices.data} error={createDevice.error || updateDevice.error ? toError(createDevice.error ?? updateDevice.error) : null} isSubmitting={createDevice.isPending || updateDevice.isPending} locations={locations.data} onCreate={createDevice.mutateAsync} onSave={(id, body) => updateDevice.mutateAsync({ id, body })} /> : null}
    </>
  );
}
