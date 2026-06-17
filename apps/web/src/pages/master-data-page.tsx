import { useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { matchesFilterText, toOptionalBoolean, toOptionalString, withPrunedSearch } from "../app/filter-utils";
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
  const navigate = useNavigate({ from: "/admin/master-data" });
  const search = useSearch({ from: "/admin/master-data" });
  const activeTab = (search.tab ?? "articles") as "articles" | "locations" | "templates" | "devices";
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
  const articleFilters = {
    category: search.category ?? "",
    criticalDefault: search.criticalDefault === true,
    medicalDevice: search.medicalDevice === true,
    mtkRequired: search.mtkRequired === true,
    q: search.q ?? "",
    stkRequired: search.stkRequired === true
  };
  const deviceFilters = {
    active: search.active ?? "",
    articleId: search.articleId ?? "",
    locationId: search.locationId ?? "",
    q: search.q ?? ""
  };

  if (user.role !== "ADMIN") {
    return <ErrorPanel error={new Error("Für Stammdaten ist eine Admin-Rolle erforderlich.")} onRetry={() => undefined} />;
  }
  if (articles.isLoading || locations.isLoading || templates.isLoading) {
    return <LoadingPanel label="Stammdaten werden geladen" />;
  }
  if (articles.isError || locations.isError || templates.isError || devices.isError || !articles.data || !locations.data || !templates.data || !devices.data) {
    return <ErrorPanel error={toError(articles.error ?? locations.error ?? templates.error ?? devices.error)} onRetry={() => void Promise.all([articles.refetch(), locations.refetch(), templates.refetch(), devices.refetch()])} />;
  }

  const filteredArticles = articles.data.filter((entry) => {
    if (articleFilters.category && entry.category !== articleFilters.category) return false;
    if (articleFilters.medicalDevice && !entry.medicalDevice) return false;
    if (articleFilters.stkRequired && !entry.stkRequired) return false;
    if (articleFilters.mtkRequired && !entry.mtkRequired) return false;
    if (articleFilters.criticalDefault && !entry.criticalDefault) return false;
    return matchesFilterText(articleFilters.q, entry.name, entry.manufacturer, entry.manufacturerPartNumber, entry.barcode);
  });

  const filteredDevices = devices.data.filter((entry) => {
    if (deviceFilters.locationId && entry.locationId !== deviceFilters.locationId) return false;
    if (deviceFilters.articleId && entry.articleId !== deviceFilters.articleId) return false;
    if (deviceFilters.active === "active" && !entry.active) return false;
    if (deviceFilters.active === "inactive" && entry.active) return false;
    return matchesFilterText(deviceFilters.q, entry.name, entry.serialNumber, entry.inventoryNumber);
  });

  function updateSearch(patch: Record<string, unknown>) {
    void navigate({
      replace: true,
      search: (current) => ({
        ...withPrunedSearch({ ...current, ...patch }),
        tab: (patch.tab as string | undefined) ?? current.tab ?? activeTab
      })
    });
  }

  function resetActiveFilters() {
    if (activeTab === "articles") {
      updateSearch({ category: undefined, criticalDefault: undefined, medicalDevice: undefined, mtkRequired: undefined, q: undefined, stkRequired: undefined });
      return;
    }
    if (activeTab === "devices") {
      updateSearch({ active: undefined, articleId: undefined, locationId: undefined, q: undefined });
    }
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
        onChange={(value) => updateSearch({ tab: value })}
        value={activeTab}
      />
      {activeTab === "articles" ? <ArticlePanel articles={filteredArticles} error={createArticle.error || updateArticle.error || deleteArticle.error ? toError(createArticle.error ?? updateArticle.error ?? deleteArticle.error) : null} filters={articleFilters} isSubmitting={createArticle.isPending || updateArticle.isPending || deleteArticle.isPending} onCreate={createArticle.mutateAsync} onDelete={deleteArticle.mutate} onFilterChange={(patch) => updateSearch({ category: toOptionalString(patch.category ?? articleFilters.category), criticalDefault: toOptionalBoolean(patch.criticalDefault ?? articleFilters.criticalDefault), medicalDevice: toOptionalBoolean(patch.medicalDevice ?? articleFilters.medicalDevice), mtkRequired: toOptionalBoolean(patch.mtkRequired ?? articleFilters.mtkRequired), q: toOptionalString(patch.q ?? articleFilters.q), stkRequired: toOptionalBoolean(patch.stkRequired ?? articleFilters.stkRequired) })} onResetFilters={resetActiveFilters} onSave={(id, body) => updateArticle.mutateAsync({ id, body })} totalCount={articles.data.length} /> : null}
      {activeTab === "locations" ? <LocationPanel error={createLocation.error || updateLocation.error || deleteLocation.error ? toError(createLocation.error ?? updateLocation.error ?? deleteLocation.error) : null} isSubmitting={createLocation.isPending || updateLocation.isPending || deleteLocation.isPending} locations={locations.data} onCreate={createLocation.mutateAsync} onDelete={deleteLocation.mutate} onSave={(id, body) => updateLocation.mutateAsync({ id, body })} /> : null}
      {activeTab === "templates" ? <TemplatePanel articles={articles.data} error={createTemplate.error || reviseTemplate.error || deleteTemplate.error ? toError(createTemplate.error ?? reviseTemplate.error ?? deleteTemplate.error) : null} isSubmitting={createTemplate.isPending || reviseTemplate.isPending || deleteTemplate.isPending} onCreate={createTemplate.mutateAsync} onDelete={deleteTemplate.mutate} onRevise={(id, body) => reviseTemplate.mutateAsync({ id, body })} templates={templates.data} /> : null}
      {activeTab === "devices" ? <DevicePanel articles={articles.data} devices={filteredDevices} error={createDevice.error || updateDevice.error ? toError(createDevice.error ?? updateDevice.error) : null} filters={deviceFilters} isSubmitting={createDevice.isPending || updateDevice.isPending} locations={locations.data} onCreate={createDevice.mutateAsync} onFilterChange={(patch) => updateSearch({ active: toOptionalString(patch.active ?? deviceFilters.active), articleId: toOptionalString(patch.articleId ?? deviceFilters.articleId), locationId: toOptionalString(patch.locationId ?? deviceFilters.locationId), q: toOptionalString(patch.q ?? deviceFilters.q) })} onResetFilters={resetActiveFilters} onSave={(id, body) => updateDevice.mutateAsync({ id, body })} totalCount={devices.data.length} /> : null}
    </>
  );
}
