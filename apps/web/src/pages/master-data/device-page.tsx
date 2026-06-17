import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { matchesFilterText, toOptionalString, withPrunedSearch } from "../../app/filter-utils";
import { toError } from "../../app/formatters";
import { ErrorPanel, LoadingPanel } from "../../components/state-panels";
import { rescueBaseApi } from "../../lib/api";
import { createMedicalDevice, listMedicalDevices, updateMedicalDevice } from "../../lib/extra-api";
import { DevicePanel } from "./device-panel";
import type { DeviceFilters } from "./types";

export function MasterDataDevicePage({ filters }: { filters: DeviceFilters }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const articles = useQuery({ queryKey: ["articles"], queryFn: rescueBaseApi.articles });
  const locations = useQuery({ queryKey: ["locations"], queryFn: rescueBaseApi.locations });
  const devices = useQuery({ queryKey: ["medical-devices"], queryFn: listMedicalDevices });
  const createDevice = useMutation({ mutationFn: createMedicalDevice, onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["medical-devices"] }) });
  const updateDevice = useMutation({ mutationFn: ({ body, id }: { id: string; body: Parameters<typeof updateMedicalDevice>[1] }) => updateMedicalDevice(id, body), onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["medical-devices"] }) });

  if (articles.isLoading || locations.isLoading || devices.isLoading) return <LoadingPanel label="Geräte werden geladen" />;
  if (articles.isError || locations.isError || devices.isError || !articles.data || !locations.data || !devices.data) return <ErrorPanel error={toError(articles.error ?? locations.error ?? devices.error)} onRetry={() => void Promise.all([articles.refetch(), locations.refetch(), devices.refetch()])} />;

  const filteredDevices = devices.data.filter((entry) => (!filters.locationId || entry.locationId === filters.locationId) && (!filters.articleId || entry.articleId === filters.articleId) && (filters.active !== "active" || entry.active) && (filters.active !== "inactive" || !entry.active) && matchesFilterText(filters.q, entry.name, entry.serialNumber, entry.inventoryNumber));

  return <DevicePanel articles={articles.data} devices={filteredDevices} error={createDevice.error || updateDevice.error ? toError(createDevice.error ?? updateDevice.error) : null} filters={filters} isSubmitting={createDevice.isPending || updateDevice.isPending} locations={locations.data} onCreate={createDevice.mutateAsync} onFilterChange={(patch) => void navigate({ replace: true, search: withPrunedSearch({ active: toOptionalString(patch.active ?? filters.active), articleId: toOptionalString(patch.articleId ?? filters.articleId), locationId: toOptionalString(patch.locationId ?? filters.locationId), q: toOptionalString(patch.q ?? filters.q) }), to: "/admin/master-data/devices" })} onResetFilters={() => void navigate({ replace: true, search: {}, to: "/admin/master-data/devices" })} onSave={(id, body) => updateDevice.mutateAsync({ id, body })} totalCount={devices.data.length} />;
}
