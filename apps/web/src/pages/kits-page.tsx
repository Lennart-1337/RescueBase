import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ErrorPanel, LoadingPanel } from "../components/state-panels";
import { rescueBaseApi } from "../lib/api";
import { toError } from "../app/formatters";
import type { Kit } from "../lib/types";
import { KitFormPanel } from "./kits/kit-form-panel";
import { KitListPanel } from "./kits/kit-list-panel";

export function KitsPage() {
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
  const rotateMutation = useMutation({
    mutationFn: rescueBaseApi.rotateKitToken,
    onSuccess: async (rotatedKit) => {
      queryClient.setQueryData<Kit[] | undefined>(["kits"], (current) =>
        current?.map((kit) => (kit.id === rotatedKit.id ? rotatedKit : kit)) ?? current
      );
      await queryClient.invalidateQueries({ queryKey: ["kits"] });
    }
  });

  function resetForm() {
    setEditingId(null);
    setName("");
    setCode("");
    setLocationId("");
    setTemplateId("");
  }

  if (kits.isLoading || locations.isLoading || templates.isLoading) return <LoadingPanel label="Rucksäcke werden geladen" />;
  if (kits.isError || locations.isError || templates.isError || !kits.data || !locations.data || !templates.data) return <ErrorPanel error={toError(kits.error ?? locations.error ?? templates.error)} onRetry={() => void Promise.all([kits.refetch(), locations.refetch(), templates.refetch()])} />;

  return (
    <>
      <header className="topbar"><div><h1>Rucksäcke</h1><p>QR/NFC-Zugänge und Einsatzstatus pro physischem Rucksack.</p></div></header>
      <KitFormPanel code={code} createError={createMutation.error ?? null} editingId={editingId} locationId={locationId} locations={locations.data} name={name} onCancel={resetForm} onCodeChange={setCode} onLocationChange={setLocationId} onNameChange={setName} onSubmit={() => { const body = { code, locationId: locationId || locations.data[0]?.id || "", name, templateId: templateId || templates.data[0]?.id || "" }; if (editingId) updateMutation.mutate({ body, id: editingId }); else createMutation.mutate(body); resetForm(); }} onTemplateChange={setTemplateId} templateId={templateId} templates={templates.data} updateError={updateMutation.error ? toError(updateMutation.error) : null} />
      <KitListPanel kits={kits.data} onEdit={(kit) => { setEditingId(kit.id); setName(kit.name); setCode(kit.code); setLocationId(kit.locationId); setTemplateId(kit.templateId); }} onRotate={(id) => rotateMutation.mutate(id)} rotateError={rotateMutation.error ?? null} rotatePending={rotateMutation.isPending} />
    </>
  );
}
