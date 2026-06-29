import { Pencil, Trash2 } from "lucide-react";
import { ListRow, RowActions } from "../../components/list-row";
import { Badge, Button } from "../../components/ui";
import type { MedicalDevice } from "../../lib/extra-api";
import { deviceStorageLabel } from "./device-storage";

export function DeviceListRow(props: {
  device: MedicalDevice;
  isSubmitting: boolean;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const { device } = props;

  return (
    <ListRow title={device.name} meta={`${deviceStorageLabel(device)} · ${device.article.name}`} actions={(
      <RowActions>
        {device.article.stkRequired ? <Badge tone="info">STK</Badge> : null}
        {device.article.mtkRequired ? <Badge tone="info">MTK</Badge> : null}
        {device.active ? <Badge tone="ready">aktiv</Badge> : <Badge tone="warning">inaktiv</Badge>}
        <Button className="mobile-icon-button" onClick={props.onEdit} type="button" variant="ghost">
          <Pencil data-icon="inline-start" />
          <span className="button-label">Bearbeiten</span>
        </Button>
        <Button
          aria-label={`${device.name} löschen`}
          className="mobile-icon-button"
          disabled={props.isSubmitting}
          onClick={props.onDelete}
          type="button"
          variant="danger"
        >
          <Trash2 data-icon="inline-start" />
          <span className="button-label">Löschen</span>
        </Button>
      </RowActions>
    )} />
  );
}
