import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ExternalLink, PackageCheck, Pencil, Plus, QrCode, RotateCw, Save, X } from "lucide-react";
import { rescueBaseApi } from "../lib/api";
import { AnchorButton, Badge, Button, Field, Panel } from "../components/ui";
import { ErrorPanel, InlineError, LoadingPanel, statusLabels, toError } from "../app/shared";

export function KitsPage() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [locationId, setLocationId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const kits = useQuery({ queryKey: ["kits"], queryFn: rescueBaseApi.kits });
  const locations = useQuery({ queryKey: ["locations"], queryFn: rescueBaseApi.locations });
  const templates = useQuery({ queryKey: ["templates"], queryFn: rescueBaseApi.templates });
  const createMutation = useMutation({
    mutationFn: rescueBaseApi.createKit,
    onSuccess: async () => {
      setName("");
      setCode("");
      await queryClient.invalidateQueries({ queryKey: ["kits"] });
    }
  });
  const updateMutation = useMutation({
    mutationFn: ({ body, id }: { body: { name: string; code: string; locationId: string; templateId: string }; id: string }) =>
      rescueBaseApi.updateKit(id, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["kits"] });
    }
  });
  const rotateMutation = useMutation({
    mutationFn: rescueBaseApi.rotateKitToken,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["kits"] });
    }
  });
  const selectedLocationId = locationId || locations.data?.[0]?.id || "";
  const selectedTemplateId = templateId || templates.data?.[0]?.id || "";
  const canSubmit = Boolean(name.trim() && code.trim() && selectedLocationId && selectedTemplateId);

  function resetForm() {
    setEditingId(null);
    setName("");
    setCode("");
    setLocationId("");
    setTemplateId("");
  }

  if (kits.isLoading || locations.isLoading || templates.isLoading) {
    return <LoadingPanel label="Rucksäcke werden geladen" />;
  }
  if (kits.isError || locations.isError || templates.isError) {
    return (
      <ErrorPanel
        error={toError(kits.error ?? locations.error ?? templates.error)}
        onRetry={() => void Promise.all([kits.refetch(), locations.refetch(), templates.refetch()])}
      />
    );
  }
  if (!kits.data || !locations.data || !templates.data) {
    return <LoadingPanel label="Rucksäcke werden geladen" />;
  }

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Rucksäcke</h1>
          <p>QR/NFC-Zugänge und Einsatzstatus pro physischem Rucksack.</p>
        </div>
      </header>
      <Panel>
        <div className="panel-header">
          <div>
            <h2>{editingId ? "Rucksack bearbeiten" : "Rucksack anlegen"}</h2>
            <p>
              {editingId
                ? "Name, Code, Standort und Vorlagenzuordnung lassen sich nachpflegen."
                : "Neue Rucksäcke erhalten automatisch einen geheimen QR/NFC-Link."}
            </p>
          </div>
          <PackageCheck />
        </div>
        <div className="form-grid form-grid-four">
          <Field label="Name">
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Rucksackkennung">
            <input value={code} onChange={(event) => setCode(event.target.value)} />
          </Field>
          <Field label="Standort">
            <select value={selectedLocationId} onChange={(event) => setLocationId(event.target.value)}>
              {locations.data.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Vorlage">
            <select value={selectedTemplateId} onChange={(event) => setTemplateId(event.target.value)}>
              {templates.data.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} v{template.version}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {createMutation.error ? <InlineError error={createMutation.error} /> : null}
        {updateMutation.error ? <InlineError error={toError(updateMutation.error)} /> : null}
        <div className="form-actions">
          <Button
            disabled={!canSubmit || createMutation.isPending || updateMutation.isPending}
            onClick={() => {
              if (editingId) {
                updateMutation.mutate({ body: { code, locationId: selectedLocationId, name, templateId: selectedTemplateId }, id: editingId });
              } else {
                createMutation.mutate({ code, locationId: selectedLocationId, name, templateId: selectedTemplateId });
              }
              resetForm();
            }}
            type="button"
          >
            {editingId ? <Save data-icon="inline-start" /> : <Plus data-icon="inline-start" />}
            {editingId ? "Rucksack speichern" : "Rucksack anlegen"}
          </Button>
          {editingId ? (
            <Button onClick={resetForm} type="button" variant="ghost">
              <X data-icon="inline-start" />
              Abbrechen
            </Button>
          ) : null}
        </div>
      </Panel>
      <Panel>
        <div className="table">
          {kits.data.map((kit) => (
            <div className="table-row kit-row" key={kit.id}>
              <span>
                <strong>{kit.name}</strong>
                <small>
                  {kit.code} · {kit.location?.name}
                </small>
              </span>
              <Badge tone={kit.status === "READY" ? "ready" : kit.status === "CONDITIONAL" ? "warning" : "danger"}>
                {statusLabels[kit.status]}
              </Badge>
              <div className="row-actions">
                <AnchorButton href={rescueBaseApi.reportUrl(`/reports/qr-label/${kit.id}.pdf?format=a4`)} variant="secondary">
                  <QrCode data-icon="inline-start" />
                  A4-PDF
                </AnchorButton>
                <AnchorButton href={rescueBaseApi.reportUrl(`/reports/qr-label/${kit.id}.pdf?format=label`)} variant="secondary">
                  <QrCode data-icon="inline-start" />
                  Etikett
                </AnchorButton>
                <Link className="button button-secondary" params={{ token: kit.publicToken }} to="/check/$token">
                  <ExternalLink data-icon="inline-start" />
                  Check öffnen
                </Link>
                <Button
                  onClick={() => {
                    setEditingId(kit.id);
                    setName(kit.name);
                    setCode(kit.code);
                    setLocationId(kit.locationId);
                    setTemplateId(kit.templateId);
                  }}
                  type="button"
                  variant="ghost"
                >
                  <Pencil data-icon="inline-start" />
                  Bearbeiten
                </Button>
                <Button disabled={rotateMutation.isPending} onClick={() => rotateMutation.mutate(kit.id)} type="button" variant="ghost">
                  <RotateCw data-icon="inline-start" />
                  Rotieren
                </Button>
              </div>
            </div>
          ))}
        </div>
        {rotateMutation.error ? <InlineError error={rotateMutation.error} /> : null}
      </Panel>
    </>
  );
}
