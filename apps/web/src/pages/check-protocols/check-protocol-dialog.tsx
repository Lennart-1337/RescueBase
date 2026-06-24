import { LoadingPanel } from "../../components/state-panels";
import { Button, Dialog } from "../../components/ui";
import type { CheckProtocolDetail } from "../../lib/types";
import { CheckProtocolDetailView } from "./check-protocol-detail-view";
import "./check-protocol-dialog.css";

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
      onClose={props.onClose}
      open={props.open}
      title="Check-Protokoll"
    >
      <div className="protocol-dialog-body">
        {props.isLoading || !props.detail ? (
          <LoadingPanel label="Protokoll wird geladen" />
        ) : (
          <CheckProtocolDetailView detail={props.detail} />
        )}
      </div>
    </Dialog>
  );
}
