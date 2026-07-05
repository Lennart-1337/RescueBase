import { SearchableSelect } from "../../components/searchable-select";
import { Button, Dialog, Field } from "../../components/ui";
import type { UserRole, UserSummary } from "../../lib/types";

const roleOptions = [
  { label: "Admin", value: "ADMIN" },
  { label: "Lagerwart", value: "WAREHOUSE" }
] as const;

export function UserRoleDialog(props: {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSave: () => void;
  onRoleChange: (role: UserRole) => void;
  role: UserRole;
  user: UserSummary | null;
}) {
  return (
    <Dialog
      actions={<><Button onClick={props.onClose} type="button" variant="ghost">Abbrechen</Button><Button disabled={!props.user} loading={props.isSubmitting} onClick={props.onSave} type="button">Rolle speichern</Button></>}
      description={props.user ? `${props.user.displayName} · ${props.user.email}` : undefined}
      onClose={props.onClose}
      open={props.isOpen}
      title="Rolle ändern"
    >
      {props.user ? <div className="form-grid form-grid-two"><Field label="Benutzer"><input disabled value={props.user.displayName} /></Field><Field label="Rolle"><SearchableSelect onChange={(value) => props.onRoleChange(value as UserRole)} options={[...roleOptions]} value={props.role} /></Field></div> : null}
    </Dialog>
  );
}
