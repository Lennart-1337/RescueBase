import { Button, Dialog } from "../../../components/ui";
export function TargetLeaveDialog(props: {
  open: boolean;
  isSaving: boolean;
  isValid: boolean;
  onCancel: () => void;
  onDiscard: () => void;
  onSave: () => void;
}) {
  return (
    <Dialog
      open={props.open}
      title="Ungespeicherte Änderungen"
      onClose={() => {
        if (!props.isSaving) props.onCancel();
      }}
      actions={
        <>
          <Button
            type="button"
            variant="ghost"
            disabled={props.isSaving}
            onClick={props.onCancel}
          >
            Weiter bearbeiten
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={props.isSaving}
            onClick={props.onDiscard}
          >
            Verwerfen und wechseln
          </Button>
          <Button
            type="button"
            disabled={!props.isValid}
            loading={props.isSaving}
            onClick={props.onSave}
          >
            Speichern und wechseln
          </Button>
        </>
      }
    >
      <p>Die geänderten Mindestmengen sind noch nicht gespeichert.</p>
    </Dialog>
  );
}
