import { CheckboxField } from "../../components/ui";
import type { MedicalDevicePermissionUser, UserSummary } from "../../lib/types";

type Props = {
  error: boolean;
  isPending: boolean;
  onChange: (enabled: boolean) => void;
  permission?: MedicalDevicePermissionUser;
  user: UserSummary;
};

export function UserAccessPermission({ error, isPending, onChange, permission, user }: Props) {
  const isAdmin = user.role === "ADMIN";
  if (error) return <p className="user-management-permission-error">Die MPG-Berechtigung konnte nicht geladen werden.</p>;
  if (!permission && !isAdmin) return <p className="user-management-permission-note">MPG-Berechtigung wird geladen …</p>;

  return <div className="user-management-permission">
    <h3>Medizinprodukte</h3>
    <CheckboxField
      checked={isAdmin || permission?.medicalDevicesManage === true}
      description={isAdmin ? "Administratoren besitzen diese Berechtigung immer." : "Erlaubt Zugriff auf MPG-Navigation, Geräteakten, Nachweise, Dateien, QR-Ziele und Exporte."}
      disabled={isAdmin || isPending}
      label="Medizinprodukte verwalten"
      onChange={(event) => onChange(event.target.checked)}
    />
  </div>;
}
