import { TargetTable } from "./table";
import { TargetToolbar } from "./toolbar";
import { TargetLeaveDialog } from "./leave-dialog";
import { useGridEditor, type TargetGridProps } from "./use-grid-editor";
import "./grid.css";

export function InventoryTargetGrid(props: TargetGridProps) {
  const controller = useGridEditor(props);
  const { editor, locationId, stock, saved } = controller;
  return (
    <section
      className="target-grid-editor"
      aria-label="Mindestbestände bearbeiten"
    >
      <div className="target-grid-title">
        <h2>Mindestbestände</h2>
        <p>Alle Artikel je Lager. Mengen direkt in der Tabelle bearbeiten.</p>
      </div>
      <TargetToolbar
        locations={props.locations}
        locationId={locationId}
        articleCount={props.articles.length}
        dirtyCount={editor.dirtyCount}
        isSaving={editor.isSaving}
        isValid={editor.isValid}
        saved={saved}
        onLocationChange={controller.requestLocation}
        onSave={() => void editor.save()}
        onDiscard={controller.discard}
      />
      <p className="target-grid-help">
        Enter / ↑ / ↓: nächste Zelle · Tab: weiter · Eine Mengenspalte aus Excel
        kann eingefügt werden. 0 oder leer: kein Mindestbestand. Verfügbar: ohne
        abgelaufene Chargen.
      </p>
      {editor.error ? (
        <p role="alert" className="target-grid-error">
          {editor.error.message} Die Eingaben bleiben erhalten. Bei einem
          Änderungskonflikt bitte „Zurücksetzen“ wählen und erneut prüfen.
        </p>
      ) : null}
      {!props.locations.length ? (
        <p>Bitte zuerst einen Lagerort anlegen.</p>
      ) : !props.articles.length ? (
        <p>Noch keine Artikel angelegt.</p>
      ) : (
        <TargetTable
          articles={props.articles}
          values={editor.values}
          errors={editor.errors}
          dirtyIds={editor.dirtyIds}
          stock={stock}
          disabled={editor.isSaving}
          onChange={editor.setValue}
          onPaste={editor.paste}
        />
      )}
      <TargetLeaveDialog
        open={controller.leaveOpen}
        isSaving={editor.isSaving}
        isValid={editor.isValid}
        onCancel={controller.cancelLeave}
        onDiscard={controller.discardAndLeave}
        onSave={() => void controller.saveAndLeave()}
      />
    </section>
  );
}
