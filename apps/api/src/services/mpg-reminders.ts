import { createHash } from 'node:crypto';
import { calendarDate } from '@rescuebase/domain';
export interface ReminderDevice {
  id: string; name: string; locationId: string | null; status: string; reasons: string[];
  requirements: { id: string; dueDate?: string | null }[];
}
export interface MpgReminder { key: string; deviceId: string; locationId: string | null; title: string; details: string; dueAt: Date | null }
export function buildMpgReminders(device: ReminderDevice, today: string): MpgReminder[] {
  calendarDate(today);
  if (device.status === 'RETIRED') return [];
  const base = { deviceId: device.id, locationId: device.locationId };
  const reminders: MpgReminder[] = [];
  for (const requirement of device.requirements) {
    if (!requirement.dueDate) continue;
    const days = (Date.parse(calendarDate(requirement.dueDate)) - Date.parse(today)) / 86400000;
    if (days !== 30 && days !== 7) continue;
    reminders.push({ ...base, key: `due:${device.id}:${requirement.id}:${requirement.dueDate}:${days}`, title: `MPG: ${device.name}`, details: `Prüfung ist am ${requirement.dueDate} fällig (in ${days} Tagen).`, dueAt: new Date(requirement.dueDate) });
  }
  if (device.status === 'BLOCKED') {
    const fingerprint = createHash('sha256').update([...device.reasons].sort().join('\n')).digest('hex');
    reminders.push({ ...base, key: `blocked:${device.id}:${fingerprint}`, title: `MPG: ${device.name} gesperrt`, details: device.reasons.join('\n'), dueAt: null });
  }
  return reminders;
}
