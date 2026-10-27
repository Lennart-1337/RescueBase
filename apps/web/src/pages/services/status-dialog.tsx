import { useState } from "react";
import { Button, Dialog, Field } from "../../components/ui";
import {
  nextStatusAction,
  statusTransitions,
  transitionLabel,
} from "./status-action-config";
import { warningLabel } from "./warning-label";
import type { StatusActionProps } from "./status-actions";
import type { ServiceStatus } from "./types";
export function StatusDialog({
  service,
  catalog,
  title,
  onTransition,
  onClose,
}: StatusActionProps & { title: string; onClose: () => void }) {
  const [next, setNext] = useState(nextStatusAction(service.status).status);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const requiresReason =
    ["COMPLETED", "CANCELLED"].includes(service.status) ||
    next === "CANCELLED" ||
    (next === "RELEASED" && service.warnings.length > 0);
  const reasonField = (
    <Field label="Begründung" required={requiresReason}>
      <textarea
        disabled={pending}
        required={requiresReason}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
    </Field>
  );
  const dialogTitle =
    nextStatusAction(service.status).status === next
      ? title
      : transitionLabel(service.status, next);
  return (
    <Dialog
      title={dialogTitle}
      open
      onClose={() => {
        if (!pending) onClose();
      }}
    >
      <form
        aria-label="Dienststatus ändern"
        className="service-status-dialog"
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          if (requiresReason && !reason.trim()) {
            setError("Bitte eine Begründung angeben.");
            return;
          }
          setPending(true);
          try {
            await onTransition(next, reason.trim());
            onClose();
          } catch (cause) {
            setError(
              cause instanceof Error
                ? cause.message
                : "Statusänderung fehlgeschlagen.",
            );
          } finally {
            setPending(false);
          }
        }}
      >
        {statusTransitions[service.status].length > 1 ? (
          <Field label="Aktion">
            <select
              disabled={pending}
              value={next}
              onChange={(event) => setNext(event.target.value as ServiceStatus)}
            >
              {statusTransitions[service.status].map((status) => (
                <option key={status} value={status}>
                  {transitionLabel(service.status, status)}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
        {next === "RELEASED" && service.warnings.length ? (
          <section className="service-release-warnings">
            <h3>
              {service.warnings.length}{" "}
              {service.warnings.length === 1
                ? "offener Planungshinweis"
                : "offene Planungshinweise"}
            </h3>
            <ul>
              {service.warnings.map((warning, index) => (
                <li key={`${warning.code}-${index}`}>
                  {warningLabel(warning, service, catalog)}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {requiresReason ? (
          reasonField
        ) : (
          <details className="service-transition-note">
            <summary>Notiz hinzufügen</summary>
            {reasonField}
          </details>
        )}
        {error ? (
          <p role="alert" className="service-error">
            {error}
          </p>
        ) : null}
        <div className="service-dialog-actions">
          <Button
            variant="secondary"
            disabled={pending}
            type="button"
            onClick={onClose}
          >
            Abbrechen
          </Button>
          <Button
            variant={next === "CANCELLED" ? "danger" : "primary"}
            type="submit"
            loading={pending}
          >
            {transitionLabel(service.status, next)}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
