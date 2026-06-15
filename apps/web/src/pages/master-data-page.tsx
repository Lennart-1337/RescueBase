import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Save, X } from "lucide-react";
import { rescueBaseApi } from "../lib/api";
import type { AuthenticatedUser, Article, KitTemplate, Location } from "../lib/types";
import { Badge, Button, Dialog, Field, Panel, Tabs } from "../components/ui";
import { ErrorPanel, InlineError, LoadingPanel, locationKindLabel, toError } from "../app/shared";

export function MasterDataPage({ user }: { user: AuthenticatedUser }) {
  const [activeTab, setActiveTab] = useState<"articles" | "locations" | "templates">("articles");
  const queryClient = useQueryClient();
  const articles = useQuery({ queryKey: ["articles"], queryFn: rescueBaseApi.articles });
  const locations = useQuery({ queryKey: ["locations"], queryFn: rescueBaseApi.locations });
  const templates = useQuery({ queryKey: ["templates"], queryFn: rescueBaseApi.templates });
  const createArticle = useMutation({
    mutationFn: rescueBaseApi.createArticle,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["articles"] });
    }
  });
  const createLocation = useMutation({
    mutationFn: rescueBaseApi.createLocation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["locations"] });
    }
  });
  const updateArticle = useMutation({
    mutationFn: ({ body, id }: { body: { name: string; unit: string; barcode?: string; criticalDefault: boolean }; id: string }) =>
      rescueBaseApi.updateArticle(id, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["articles"] });
    }
  });
  const updateLocation = useMutation({
    mutationFn: ({ body, id }: { body: { name: string; kind: string }; id: string }) => rescueBaseApi.updateLocation(id, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["locations"] });
    }
  });
  const createTemplate = useMutation({
    mutationFn: rescueBaseApi.createTemplate,
    onSuccess: async () => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["templates"] }), queryClient.invalidateQueries({ queryKey: ["kits"] })]);
    }
  });
  const reviseTemplate = useMutation({
    mutationFn: ({
      body,
      id
    }: {
      body: { positions: Array<{ articleId: string; moduleName?: string; requiredQuantity: number; critical: boolean }> };
      id: string;
    }) => rescueBaseApi.reviseTemplate(id, body),
    onSuccess: async () => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["templates"] }), queryClient.invalidateQueries({ queryKey: ["kits"] })]);
    }
  });

  if (user.role !== "ADMIN") {
    return <ErrorPanel error={new Error("Für Stammdaten ist eine Admin-Rolle erforderlich.")} onRetry={() => undefined} />;
  }
  if (articles.isLoading || locations.isLoading || templates.isLoading) {
    return <LoadingPanel label="Stammdaten werden geladen" />;
  }
  if (articles.isError || locations.isError || templates.isError) {
    return (
      <ErrorPanel
        error={toError(articles.error ?? locations.error ?? templates.error)}
        onRetry={() => void Promise.all([articles.refetch(), locations.refetch(), templates.refetch()])}
      />
    );
  }
  if (!articles.data || !locations.data || !templates.data) {
    return <LoadingPanel label="Stammdaten werden geladen" />;
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
        items={[
          { label: "Artikel", value: "articles" },
          { label: "Lagerorte", value: "locations" },
          { label: "Rucksackvorlagen", value: "templates" }
        ]}
        label="Stammdatenbereiche"
        onChange={(value) => setActiveTab(value as "articles" | "locations" | "templates")}
        value={activeTab}
      />
      {activeTab === "articles" ? (
        <ArticlePanel
          articles={articles.data}
          error={createArticle.error || updateArticle.error ? toError(createArticle.error ?? updateArticle.error) : null}
          isSubmitting={createArticle.isPending || updateArticle.isPending}
          onCreate={(body) => createArticle.mutateAsync(body)}
          onSave={(id, body) => updateArticle.mutateAsync({ body, id })}
        />
      ) : null}
      {activeTab === "locations" ? (
        <LocationPanel
          error={createLocation.error || updateLocation.error ? toError(createLocation.error ?? updateLocation.error) : null}
          isSubmitting={createLocation.isPending || updateLocation.isPending}
          locations={locations.data}
          onCreate={(body) => createLocation.mutateAsync(body)}
          onSave={(id, body) => updateLocation.mutateAsync({ body, id })}
        />
      ) : null}
      {activeTab === "templates" ? (
        <TemplatePanel
          articles={articles.data}
          error={createTemplate.error || reviseTemplate.error ? toError(createTemplate.error ?? reviseTemplate.error) : null}
          isSubmitting={createTemplate.isPending || reviseTemplate.isPending}
          onCreate={(body) => createTemplate.mutateAsync(body)}
          onRevise={(id, body) => reviseTemplate.mutateAsync({ body, id })}
          templates={templates.data}
        />
      ) : null}
    </>
  );
}

function ArticlePanel({
  articles,
  error,
  isSubmitting,
  onCreate,
  onSave
}: {
  articles: Article[];
  error: Error | null;
  isSubmitting: boolean;
  onCreate: (body: { name: string; unit: string; barcode?: string; criticalDefault: boolean }) => Promise<unknown>;
  onSave: (id: string, body: { name: string; unit: string; barcode?: string; criticalDefault: boolean }) => Promise<unknown>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("Stück");
  const [barcode, setBarcode] = useState("");
  const [criticalDefault, setCriticalDefault] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const canSubmit = Boolean(name.trim() && unit.trim());

  function resetForm() {
    setEditingId(null);
    setName("");
    setUnit("Stück");
    setBarcode("");
    setCriticalDefault(false);
  }
  function closeDialog() {
    setIsOpen(false);
    resetForm();
  }
  async function submitArticle() {
    if (!canSubmit) return;
    const body = { name, unit, barcode: barcode.trim() || undefined, criticalDefault };
    try {
      if (editingId) await onSave(editingId, body);
      else await onCreate(body);
      closeDialog();
    } catch {
      return;
    }
  }

  return (
    <Panel>
      <div className="panel-header">
        <div>
          <h2>Artikel</h2>
          <p>Materialstamm mit Einheit, optionalem Barcode und Kritikalität.</p>
        </div>
        <Button onClick={() => { resetForm(); setIsOpen(true); }} type="button">
          <Plus data-icon="inline-start" />
          Artikel hinzufügen
        </Button>
      </div>
      {articles.length === 0 ? <div className="compact-list-empty">Noch keine Artikel angelegt.</div> : null}
      <div className="compact-list">
        {articles.map((article) => (
          <div className="compact-list-row compact-list-row-actions" key={article.id}>
            <span>
              <strong>{article.name}</strong>
              <small>
                {article.unit}
                {article.barcode ? ` · ${article.barcode}` : ""}
              </small>
            </span>
            <div className="row-actions">
              {article.criticalDefault ? <Badge tone="info">kritisch</Badge> : null}
              <Button
                onClick={() => {
                  setEditingId(article.id);
                  setName(article.name);
                  setUnit(article.unit);
                  setBarcode(article.barcode ?? "");
                  setCriticalDefault(article.criticalDefault);
                  setIsOpen(true);
                }}
                type="button"
                variant="ghost"
              >
                <Pencil data-icon="inline-start" />
                Bearbeiten
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Dialog
        actions={
          <>
            <Button disabled={isSubmitting} onClick={closeDialog} type="button" variant="ghost">
              <X data-icon="inline-start" />
              Abbrechen
            </Button>
            <Button disabled={!canSubmit || isSubmitting} onClick={() => void submitArticle()} type="button">
              {editingId ? <Save data-icon="inline-start" /> : <Plus data-icon="inline-start" />}
              {editingId ? "Artikel speichern" : "Artikel anlegen"}
            </Button>
          </>
        }
        description="Pflegen Sie Materialstammdaten mit Einheit, optionalem Barcode und Standard-Kritikalität."
        onClose={closeDialog}
        open={isOpen}
        title={editingId ? "Artikel bearbeiten" : "Artikel anlegen"}
      >
        <div className="form-grid form-grid-two">
          <Field label="Name">
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Einheit">
            <input value={unit} onChange={(event) => setUnit(event.target.value)} />
          </Field>
          <Field label="Barcode/DataMatrix">
            <input value={barcode} onChange={(event) => setBarcode(event.target.value)} />
          </Field>
          <label className="check-field">
            <input checked={criticalDefault} onChange={(event) => setCriticalDefault(event.target.checked)} type="checkbox" />
            <span>Kritisch als Standard</span>
          </label>
        </div>
        {error ? <InlineError error={error} /> : null}
      </Dialog>
    </Panel>
  );
}

function LocationPanel({
  error,
  isSubmitting,
  locations,
  onCreate,
  onSave
}: {
  error: Error | null;
  isSubmitting: boolean;
  locations: Location[];
  onCreate: (body: { name: string; kind: string }) => Promise<unknown>;
  onSave: (id: string, body: { name: string; kind: string }) => Promise<unknown>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("STORAGE");
  const [editingId, setEditingId] = useState<string | null>(null);
  const canSubmit = Boolean(name.trim() && kind);

  function resetForm() {
    setEditingId(null);
    setName("");
    setKind("STORAGE");
  }
  function closeDialog() {
    setIsOpen(false);
    resetForm();
  }
  async function submitLocation() {
    if (!canSubmit) return;
    const body = { kind, name };
    try {
      if (editingId) await onSave(editingId, body);
      else await onCreate(body);
      closeDialog();
    } catch {
      return;
    }
  }

  return (
    <Panel>
      <div className="panel-header">
        <div>
          <h2>Lagerorte</h2>
          <p>Standorte für Chargen und physische Rucksäcke.</p>
        </div>
        <Button onClick={() => { resetForm(); setIsOpen(true); }} type="button">
          <Plus data-icon="inline-start" />
          Lagerort hinzufügen
        </Button>
      </div>
      {locations.length === 0 ? <div className="compact-list-empty">Noch keine Lagerorte angelegt.</div> : null}
      <div className="compact-list">
        {locations.map((location) => (
          <div className="compact-list-row compact-list-row-actions" key={location.id}>
            <span>
              <strong>{location.name}</strong>
              <small>{locationKindLabel(location.kind)}</small>
            </span>
            <div className="row-actions">
              <Button
                onClick={() => {
                  setEditingId(location.id);
                  setName(location.name);
                  setKind(location.kind);
                  setIsOpen(true);
                }}
                type="button"
                variant="ghost"
              >
                <Pencil data-icon="inline-start" />
                Bearbeiten
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Dialog
        actions={
          <>
            <Button disabled={isSubmitting} onClick={closeDialog} type="button" variant="ghost">
              <X data-icon="inline-start" />
              Abbrechen
            </Button>
            <Button disabled={!canSubmit || isSubmitting} onClick={() => void submitLocation()} type="button">
              {editingId ? <Save data-icon="inline-start" /> : <Plus data-icon="inline-start" />}
              {editingId ? "Lagerort speichern" : "Lagerort anlegen"}
            </Button>
          </>
        }
        description="Pflegen Sie Lager, Fahrzeuge und Räume als nutzbare Orte für Bestand und Rucksäcke."
        onClose={closeDialog}
        open={isOpen}
        title={editingId ? "Lagerort bearbeiten" : "Lagerort anlegen"}
      >
        <div className="form-grid form-grid-two">
          <Field label="Name">
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Typ">
            <select value={kind} onChange={(event) => setKind(event.target.value)}>
              <option value="STORAGE">Lager</option>
              <option value="VEHICLE">Fahrzeug</option>
              <option value="ROOM">Raum</option>
            </select>
          </Field>
        </div>
        {error ? <InlineError error={error} /> : null}
      </Dialog>
    </Panel>
  );
}

function TemplatePanel({
  articles,
  error,
  isSubmitting,
  onCreate,
  onRevise,
  templates
}: {
  articles: Article[];
  error: Error | null;
  isSubmitting: boolean;
  onCreate: (body: { name: string; positions: Array<{ articleId: string; moduleName?: string; requiredQuantity: number; critical: boolean }> }) => Promise<unknown>;
  onRevise: (id: string, body: { positions: Array<{ articleId: string; moduleName?: string; requiredQuantity: number; critical: boolean }> }) => Promise<unknown>;
  templates: KitTemplate[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [positions, setPositions] = useState([{ articleId: articles[0]?.id ?? "", critical: false, moduleName: "", requiredQuantity: 1 }]);
  const normalizedPositions = positions.map((position) => ({
    articleId: position.articleId || articles[0]?.id || "",
    critical: position.critical,
    moduleName: position.moduleName.trim() || undefined,
    requiredQuantity: position.requiredQuantity
  }));
  const canCreate = Boolean(name.trim() && articles.length > 0 && normalizedPositions.every((position) => position.articleId && position.requiredQuantity > 0));

  useEffect(() => {
    const firstArticleId = articles[0]?.id;
    if (firstArticleId && positions.some((position) => !position.articleId)) {
      setPositions((current) => current.map((position) => ({ ...position, articleId: position.articleId || firstArticleId })));
    }
  }, [articles, positions]);

  function resetForm() {
    setEditingTemplateId(null);
    setName("");
    setPositions([{ articleId: articles[0]?.id ?? "", critical: false, moduleName: "", requiredQuantity: 1 }]);
  }
  function closeDialog() {
    setIsOpen(false);
    resetForm();
  }
  async function submitTemplate() {
    if (!canCreate) return;
    try {
      if (editingTemplateId) await onRevise(editingTemplateId, { positions: normalizedPositions });
      else await onCreate({ name, positions: normalizedPositions });
      closeDialog();
    } catch {
      return;
    }
  }
  function updatePosition(index: number, patch: Partial<{ articleId: string; moduleName: string; requiredQuantity: number; critical: boolean }>) {
    setPositions((current) => current.map((position, currentIndex) => (currentIndex === index ? { ...position, ...patch } : position)));
  }

  return (
    <Panel>
      <div className="panel-header">
        <div>
          <h2>Rucksackvorlagen</h2>
          <p>Versionierte Soll-Listen mit Artikeln, Modulen und kritischen Positionen.</p>
        </div>
        <Button disabled={articles.length === 0} onClick={() => { resetForm(); setIsOpen(true); }} type="button">
          <Plus data-icon="inline-start" />
          Vorlage hinzufügen
        </Button>
      </div>
      {articles.length === 0 ? <div className="compact-list-empty">Vorlagen benötigen zuerst mindestens einen Artikel.</div> : null}
      {templates.length === 0 ? <div className="compact-list-empty">Noch keine Vorlagen angelegt.</div> : null}
      <div className="compact-list">
        {templates.map((template) => (
          <div className="compact-list-row compact-list-row-actions" key={template.id}>
            <span>
              <strong>
                {template.name} v{template.version}
              </strong>
              <small>{template.positions.length} Positionen</small>
            </span>
            <div className="row-actions">
              {template.positions.some((position) => position.critical) ? <Badge tone="info">enthält kritisch</Badge> : null}
              <Button
                onClick={() => {
                  setEditingTemplateId(template.id);
                  setName(template.name);
                  setPositions(template.positions.map((position) => ({
                    articleId: position.articleId,
                    critical: position.critical,
                    moduleName: position.moduleName ?? "",
                    requiredQuantity: position.requiredQuantity
                  })));
                  setIsOpen(true);
                }}
                type="button"
                variant="ghost"
              >
                <Pencil data-icon="inline-start" />
                Bearbeiten
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Dialog
        actions={
          <>
            <Button disabled={isSubmitting} onClick={closeDialog} type="button" variant="ghost">
              <X data-icon="inline-start" />
              Abbrechen
            </Button>
            <Button disabled={!canCreate || isSubmitting} onClick={() => void submitTemplate()} type="button">
              {editingTemplateId ? <Save data-icon="inline-start" /> : <Plus data-icon="inline-start" />}
              {editingTemplateId ? "Neue Version speichern" : "Vorlage speichern"}
            </Button>
          </>
        }
        description={editingTemplateId ? "Bestehende Vorlagen bleiben historisch erhalten. Änderungen werden als neue Version gespeichert." : "Definieren Sie Sollmengen, optionale Module und kritische Positionen für neue Rucksäcke."}
        onClose={closeDialog}
        open={isOpen}
        title={editingTemplateId ? "Rucksackvorlage bearbeiten" : "Rucksackvorlage anlegen"}
      >
        <div className="template-form">
          <Field label="Vorlagenname">
            <input disabled={Boolean(editingTemplateId)} onChange={(event) => setName(event.target.value)} value={name} />
          </Field>
          <div className="template-position-list">
            {positions.map((position, index) => (
              <div className="template-position-row" key={index}>
                <Field label="Artikel">
                  <select
                    disabled={articles.length === 0}
                    onChange={(event) => updatePosition(index, { articleId: event.target.value })}
                    value={position.articleId || articles[0]?.id || ""}
                  >
                    {articles.map((article) => (
                      <option key={article.id} value={article.id}>
                        {article.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Modul">
                  <input onChange={(event) => updatePosition(index, { moduleName: event.target.value })} value={position.moduleName} />
                </Field>
                <Field label="Sollmenge">
                  <input min="1" onChange={(event) => updatePosition(index, { requiredQuantity: Number(event.target.value) })} type="number" value={position.requiredQuantity} />
                </Field>
                <label className="check-field template-critical">
                  <input checked={position.critical} onChange={(event) => updatePosition(index, { critical: event.target.checked })} type="checkbox" />
                  <span>Kritisch</span>
                </label>
                <Button
                  disabled={positions.length === 1}
                  onClick={() => setPositions((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                  type="button"
                  variant="ghost"
                >
                  Entfernen
                </Button>
              </div>
            ))}
          </div>
          <div className="form-actions split-actions">
            <Button
              disabled={articles.length === 0}
              onClick={() => setPositions((current) => [...current, { articleId: articles[0]?.id ?? "", critical: false, moduleName: "", requiredQuantity: 1 }])}
              type="button"
              variant="secondary"
            >
              <Plus data-icon="inline-start" />
              Position hinzufügen
            </Button>
          </div>
          {articles.length === 0 ? <InlineError error={new Error("Legen Sie zuerst mindestens einen Artikel an.")} /> : null}
          {error ? <InlineError error={error} /> : null}
        </div>
      </Dialog>
    </Panel>
  );
}
