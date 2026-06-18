import { LoadingPanel } from "../../components/state-panels";
import { Button, Dialog } from "../../components/ui";
import type { CheckProtocolDetail } from "../../lib/types";
import { CheckProtocolDetailView } from "./check-protocol-detail-view";

export function CheckProtocolDialog(props: {
  detail?: CheckProtocolDetail;
  isLoading: boolean;
  onClose: () => void;
  open: boolean;
}) {
  return (
    <Dialog
      actions={
        <Button onClick={props.onClose} type="button" variant="secondary">
          Schließen
        </Button>
      }
      description="Vollständige Dokumentation des abgeschlossenen Rucksackchecks."
      onClose={props.onClose}
      open={props.open}
      title="Check-Protokoll"
    >
      {props.isLoading || !props.detail ? (
        <LoadingPanel label="Protokoll wird geladen" />
      ) : (
        <CheckProtocolDetailView detail={props.detail} />
      )}
    </Dialog>
  );
}
