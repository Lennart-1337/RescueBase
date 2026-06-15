import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toError } from "../app/formatters";
import { ErrorPanel, LoadingPanel } from "../components/state-panels";
import { rescueBaseApi } from "../lib/api";
import type { Kit } from "../lib/types";
import { KitFormPanel } from "./kits/kit-form-panel";
import { KitListPanel } from "./kits/kit-list-panel";

export function KitsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [locationId, setLocationId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const queryClient = useQueryClient();
  const kits = useQuery({ queryKey: ["kits"], queryFn: rescueBaseApi.kits });
  const locations = useQuery({ queryKey: ["locations"], queryFn: rescueBaseApi.locations });
  const templates = useQuery({ queryKey: ["templates"], queryFn: rescueBaseApi.templates });
  const createMutation = useMutation({ mutationFn: rescueBaseApi.createKit, onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["kits"] }) });
  const updateMutation = useMutation({ mutationFn: ({ body, id }: { body: { name: string; code: string; locationId: string; templateId: string }; id: string }) => rescueBaseApi.updateKit(id, body), onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["kits"] }) });
  const rotateMutation = useMutation({ mutationFn: rescueBaseApi.rotateKitToken, onSuccess: async (rotatedKit) => { queryClient.setQueryData<Kit[] | undefined>(["kits"], (current) => current?.map((kit) => (kit.id === rotatedKit.id ? rotatedKit : kit)) ?? current); await queryClient.invalidateQueries({ queryKey: ["kits"] }); } });

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

  if (kits.isLoading || locations.isLoading || templates.isLoading) return <LoadingPanel label="Rucksäcke werden geladen" />;
  if (kits.isError || locations.isError || templates.isError || !kits.data || !locations.data || !templates.data) return <ErrorPanel error={toError(kits.error ?? locations.error ?? templates.error)} onRetry={() => void Promise.all([kits.refetch(), locations.refetch(), templates.refetch()])} />;

  return (
    <>
      <header className="topbar"><div><h1>Rucksäcke</h1><p>QR/NFC-Zugänge und Einsatzstatus pro physischem Rucksack.</p></div></header>
      <KitListPanel kits={kits.data} onCreate={openForCreate} onEdit={openForEdit} onRotate={(id) => rotateMutation.mutate(id)} rotateError={rotateMutation.error ?? null} rotatePending={rotateMutation.isPending} />
      <KitFormPanel code={code} editingId={editingId} error={createMutation.error || updateMutation.error ? toError(createMutation.error ?? updateMutation.error) : null} isOpen={isOpen} isSubmitting={createMutation.isPending || updateMutation.isPending} locationId={locationId} locations={locations.data} name={name} onClose={closeDialog} onCodeChange={setCode} onLocationChange={setLocationId} onNameChange={setName} onSubmit={() => void submit()} onTemplateChange={setTemplateId} templateId={templateId} templates={templates.data} />
    </>
  );
}
