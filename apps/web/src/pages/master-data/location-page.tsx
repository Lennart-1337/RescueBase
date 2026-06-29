import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toError } from "../../app/formatters";
import { ErrorPanel, LoadingPanel } from "../../components/state-panels";
import { rescueBaseApi } from "../../lib/api";
import { catalogKeys, catalogQueries } from "../../queries/catalog";
import { inventoryKeys } from "../../queries/inventory";
import { LocationPanel } from "./location-panel";

export function MasterDataLocationPage() {
  const queryClient = useQueryClient();
  const locations = useQuery(catalogQueries.locations());
  const createLocation = useMutation({ mutationFn: rescueBaseApi.createLocation, onSuccess: async () => queryClient.invalidateQueries({ queryKey: catalogKeys.locations() }) });
  const updateLocation = useMutation({ mutationFn: ({ body, id }: Parameters<typeof rescueBaseApi.updateLocation> extends [infer I, infer B] ? { id: I & string; body: B } : never) => rescueBaseApi.updateLocation(id, body), onSuccess: async () => queryClient.invalidateQueries({ queryKey: catalogKeys.locations() }) });
  const deleteLocation = useMutation({ mutationFn: rescueBaseApi.deleteLocation, onSuccess: async () => Promise.all([queryClient.invalidateQueries({ queryKey: catalogKeys.locations() }), queryClient.invalidateQueries({ queryKey: catalogKeys.kits() }), queryClient.invalidateQueries({ queryKey: inventoryKeys.batches() })]) });

  if (locations.isLoading) return <LoadingPanel label="Lagerorte werden geladen" />;
  if (locations.isError || !locations.data) return <ErrorPanel error={toError(locations.error)} onRetry={() => void locations.refetch()} />;

  return <LocationPanel error={createLocation.error || updateLocation.error || deleteLocation.error ? toError(createLocation.error ?? updateLocation.error ?? deleteLocation.error) : null} isSubmitting={createLocation.isPending || updateLocation.isPending || deleteLocation.isPending} locations={locations.data} onCreate={createLocation.mutateAsync} onDelete={deleteLocation.mutate} onSave={(id, body) => updateLocation.mutateAsync({ id, body })} />;
}
