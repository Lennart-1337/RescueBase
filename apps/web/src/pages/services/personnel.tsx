import type { ServiceEditorProps } from "./editor";
import { PersonnelPositions } from "./personnel-positions";
import { PersonnelAssignments } from "./personnel-assignments";
export function Personnel(props: ServiceEditorProps) {
  return <div className="service-stack">
    <PersonnelPositions {...props} />
    <PersonnelAssignments {...props} />
  </div>;
}
