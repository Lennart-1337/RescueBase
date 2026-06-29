import { useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { matchesFilterText, toOptionalString, withPrunedSearch } from "../app/filter-utils";
import { toError } from "../app/formatters";
import { PageHeader, PageToolbar } from "../components/page-layout";
import { ErrorPanel, LoadingPanel } from "../components/state-panels";
import { Button } from "../components/ui";
import { Plus } from "lucide-react";
import { rescueBaseApi } from "../lib/api";
import type { Kit } from "../lib/types";
import { catalogKeys, catalogQueries } from "../queries/catalog";
import { KitFormPanel } from "./kits/kit-form-panel";
import { KitFilterToolbar } from "./kits/kit-filter-toolbar";
import { KitListPanel } from "./kits/kit-list-panel";

export function KitsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [locationId, setLocationId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const queryClient = useQueryClient();
  const navigate = useNavigate({ from: "/admin/kits" });
  const search = useSearch({ from: "/admin/kits" });
  const kits = useQuery(catalogQueries.kits());
  const locations = useQuery(catalogQueries.locations());
  const templates = useQuery(catalogQueries.templates());
  const createMutation = useMutation({ mutationFn: rescueBaseApi.createKit, onSuccess: async () => queryClient.invalidateQueries({ queryKey: catalogKeys.kits() }) });
  const updateMutation = useMutation({ mutationFn: ({ body, id }: { body: { name: string; code: string; locationId: string; templateId: string }; id: string }) => rescueBaseApi.updateKit(id, body), onSuccess: async () => queryClient.invalidateQueries({ queryKey: catalogKeys.kits() }) });
  const rotateMutation = useMutation({ mutationFn: rescueBaseApi.rotateKitToken, onSuccess: async (rotatedKit) => { queryClient.setQueryData<Kit[] | undefined>(catalogKeys.kits(), (current) => current?.map((kit) => (kit.id === rotatedKit.id ? rotatedKit : kit)) ?? current); await queryClient.invalidateQueries({ queryKey: catalogKeys.kits() }); } });
  const deleteMutation = useMutation({ mutationFn: rescueBaseApi.deleteKit, onSuccess: async () => queryClient.invalidateQueries({ queryKey: catalogKeys.kits() }) });
  const filters = {
    locationId: search.locationId ?? "",
    q: search.q ?? "",
    status: search.status ?? "",
    templateId: search.templateId ?? ""
  };

  function resetForm() {
    setEditingId(null);
    setName("");
    setCode("");
    setLocationId("");
    setTemplateId("");
  }

  function closeDialog() {
    setIsOpen(false);
    resetForm();
  }

  function openForCreate() {
    resetForm();
    setIsOpen(true);
  }

  function openForEdit(kit: Kit) {
    setEditingId(kit.id);
    setName(kit.name);
    setCode(kit.code);
    setLocationId(kit.locationId);
    setTemplateId(kit.templateId);
    setIsOpen(true);
  }

  async function submit() {
    if (!locations.data || !templates.data) return;
    const body = { code, locationId: locationId || locations.data[0]?.id || "", name, templateId: templateId || templates.data[0]?.id || "" };
    const succeeded = await (editingId ? updateMutation.mutateAsync({ body, id: editingId }) : createMutation.mutateAsync(body)).then(() => true).catch(() => false);
    if (succeeded) closeDialog();
  }

  const filteredKits = (kits.data ?? []).filter((entry) => {
    if (filters.locationId && entry.locationId !== filters.locationId) return false;
    if (filters.templateId && entry.templateId !== filters.templateId) return false;
    if (filters.status && entry.status !== filters.status) return false;
    return matchesFilterText(filters.q, entry.name, entry.code);
  });

  function updateFilters(patch: Partial<typeof filters>) {
    void navigate({
      replace: true,
      search: (current) => withPrunedSearch({
        ...current,
        locationId: toOptionalString(patch.locationId ?? filters.locationId),
        q: toOptionalString(patch.q ?? filters.q),
        status: toOptionalString(patch.status ?? filters.status),
        templateId: toOptionalString(patch.templateId ?? filters.templateId)
      })
    });
  }

  function resetFilters() {
    void navigate({
      replace: true,
      search: () => ({})
    });
  }

  if (kits.isLoading || locations.isLoading || templates.isLoading) return <LoadingPanel label="Rucksäcke werden geladen" />;
  if (kits.isError || locations.isError || templates.isError || !kits.data || !locations.data || !templates.data) return <ErrorPanel error={toError(kits.error ?? locations.error ?? templates.error)} onRetry={() => void Promise.all([kits.refetch(), locations.refetch(), templates.refetch()])} />;

  return (
    <>
      <PageHeader actions={<Button onClick={openForCreate} type="button"><Plus data-icon="inline-start" />Rucksack hinzufügen</Button>} title="Rucksäcke" />
      <PageToolbar label="Rucksäcke filtern"><KitFilterToolbar countLabel={`${filteredKits.length}/${kits.data.length} sichtbar`} filters={filters} locations={locations.data} onChange={updateFilters} onReset={resetFilters} templates={templates.data} /></PageToolbar>
      <KitListPanel actionError={rotateMutation.error ?? deleteMutation.error ?? null} actionPending={rotateMutation.isPending || deleteMutation.isPending} kits={filteredKits} onDelete={(id) => deleteMutation.mutate(id)} onEdit={openForEdit} onRotate={(id) => rotateMutation.mutate(id)} />
      <KitFormPanel code={code} editingId={editingId} error={createMutation.error || updateMutation.error ? toError(createMutation.error ?? updateMutation.error) : null} isOpen={isOpen} isSubmitting={createMutation.isPending || updateMutation.isPending} locationId={locationId} locations={locations.data} name={name} onClose={closeDialog} onCodeChange={setCode} onLocationChange={setLocationId} onNameChange={setName} onSubmit={() => void submit()} onTemplateChange={setTemplateId} templateId={templateId} templates={templates.data} />
    </>
  );
}
