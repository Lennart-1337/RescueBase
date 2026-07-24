import { useCallback, useState } from "react";
import { House, PackageSearch, RotateCcw, TriangleAlert } from "lucide-react";
import { NightShiftArchive } from "./night-shift-archive";
import { useDocumentTitle } from "./document-title";
import { DeliveryEasterEgg } from "./delivery-easter-egg";
import { useSecretSequence } from "./use-secret-sequence";
import "./route-error-page.css";

type RouteErrorPageProps = {
  error?: Error;
  kind?: "error" | "not-found";
  reset?: () => void;
};

export function RouteErrorPage({ error, kind = "error", reset }: RouteErrorPageProps) {
  const [inventoryClicks, setInventoryClicks] = useState(0);
  const [isNightArchiveOpen, setIsNightArchiveOpen] = useState(false);
  const isNotFound = kind === "not-found";
  const Icon = isNotFound ? PackageSearch : TriangleAlert;
  const title = isNotFound ? "Dieser Bestandseintrag existiert nicht." : "Diese Ansicht konnte nicht geladen werden.";

  useDocumentTitle(isNotFound ? "Seite nicht gefunden" : "Fehler");
  useSecretSequence("nacht", useCallback(() => setIsNightArchiveOpen(true), []));

  return (
    <main className="route-error-page">
      <section className="route-error-content" aria-labelledby="route-error-title">
        <div aria-hidden="true" className="route-error-index">
          <Icon />
          <span>RescueBase</span>
          <span>Bestand</span>
        </div>
        <div className="route-error-main">
          {isNotFound ? <button aria-label="Interne Inventurnummer 404" className="route-error-code" onClick={() => setInventoryClicks((count) => Math.min(count + 1, 3))} type="button">404</button> : <span className="route-error-code">Fehler</span>}
          <h1 id="route-error-title">{title}</h1>
          <p>{isNotFound ? "Der angefragte Eintrag wurde möglicherweise verschoben, gelöscht oder war nie angelegt." : "RescueBase hatte gerade Schwierigkeiten beim Laden. Deine bereits gespeicherten Daten sind davon nicht betroffen."}</p>
          <div className="route-error-actions">
            {isNotFound ? <a className="button button-primary" href="/"><House data-icon="inline-start" />Zur Übersicht</a> : <button className="button button-primary" onClick={reset} type="button"><RotateCcw data-icon="inline-start" />Erneut versuchen</button>}
            {!isNotFound ? <a className="button button-secondary" href="/"><House data-icon="inline-start" />Zur Übersicht</a> : null}
          </div>
          {inventoryClicks === 3 ? <DeliveryEasterEgg /> : null}
          {isNightArchiveOpen ? <NightShiftArchive /> : null}
          {!isNotFound && import.meta.env.DEV && error ? <p className="route-error-detail">Interne Meldung: {error.name || "Unbekannter Fehler"}</p> : null}
        </div>
      </section>
    </main>
  );
}
