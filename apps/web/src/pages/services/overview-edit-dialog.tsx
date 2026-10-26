import { Dialog } from "../../components/ui";
import { ServiceForm } from "./form";
import {
  normalizeOverview,
  overviewFields,
  overviewInitial,
} from "./service-fields";
import type { ServiceEditorProps } from "./editor";
export function OverviewEditDialog({
  service,
  catalog,
  locked,
  save,
  onClose,
}: ServiceEditorProps & { onClose: () => void }) {
  return (
    <Dialog title="Dienst bearbeiten" open onClose={onClose} size="wide">
      <ServiceForm
        title="Dienstangaben"
        hideLegend
        fields={overviewFields(catalog)}
        initial={overviewInitial(service)}
        disabled={locked}
        onSubmit={async (values) => {
          await save(normalizeOverview(values));
          onClose();
        }}
      />
    </Dialog>
  );
}
