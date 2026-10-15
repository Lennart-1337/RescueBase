import { useEffect, useRef, useState } from "react";
import type { InventoryTarget } from "../../../lib/types";
import { buildChanges, createValues, getDirtyIds, parseQuantity, parseTabularPaste, type TargetBaseline, type TargetChange } from "./model";

type Props = {
  locationId: string;
  articleIds: string[];
  targets: InventoryTarget[];
  onSave: (changes: TargetChange[]) => Promise<unknown>;
};

export function useTargetGrid({ locationId, articleIds, targets, onSave }: Props) {
  const incoming: TargetBaseline = Object.fromEntries(targets.filter((target) => target.locationId === locationId).map((target) => [target.articleId, target.targetQuantity]));
  const sourceKey = JSON.stringify([locationId, articleIds, incoming]);
  const [state, setState] = useState(() => ({ locationId, baseline: incoming, values: createValues(articleIds, incoming) }));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const saving = useRef(false);
  const latest = useRef({ incoming, articleIds, locationId });
  latest.current = { incoming, articleIds, locationId };

  useEffect(() => {
    if (saving.current) return;
    const { incoming: baseline, articleIds: ids, locationId: selected } = latest.current;
    setState((previous) => {
      if (previous.locationId !== selected) return { locationId: selected, baseline, values: createValues(ids, baseline) };
      const dirty = new Set(getDirtyIds(ids, previous.baseline, previous.values));
      const nextBaseline: TargetBaseline = {};
      for (const id of ids) {
        const value = dirty.has(id) ? previous.baseline[id] : baseline[id];
        if (value !== undefined) nextBaseline[id] = value;
      }
      return { locationId: selected, baseline: nextBaseline,
        values: Object.fromEntries(ids.map((id) => [id, dirty.has(id) ? previous.values[id] ?? "" : String(baseline[id] ?? 0)])),
      };
    });
  }, [sourceKey]);

  const dirtyIds = getDirtyIds(articleIds, state.baseline, state.values);
  const errors: Record<string, string> = {};
  for (const id of articleIds) {
    try { parseQuantity(state.values[id] ?? ""); }
    catch (cause) { errors[id] = (cause as Error).message; }
  }
  function setValue(id: string, value: string) {
    if (saving.current || !articleIds.includes(id)) return;
    setError(null);
    setState((previous) => ({ ...previous, values: { ...previous.values, [id]: value } }));
  }
  function paste(startRow: number, text: string): boolean {
    if (saving.current) return false;
    try {
      if (!Number.isInteger(startRow) || startRow < 0 || startRow >= articleIds.length) throw new Error("Bitte eine gültige Artikelzeile auswählen.");
      const pasted = parseTabularPaste(text, articleIds.length - startRow);
      setState((previous) => ({ ...previous, values: { ...previous.values, ...Object.fromEntries(pasted.map((value, index) => [articleIds[startRow + index], value])) } }));
      setError(null);
      return true;
    } catch (cause) { setError(cause as Error); return false; }
  }
  function discard() {
    if (saving.current) return;
    setState({ locationId, baseline: incoming, values: createValues(articleIds, incoming) });
    setError(null);
  }
  async function save(): Promise<boolean> {
    if (saving.current) return false;
    let changes: TargetChange[];
    try { changes = buildChanges(articleIds, state.baseline, state.values); }
    catch (cause) { setError(cause as Error); return false; }
    if (!changes.length) return true;
    saving.current = true;
    setIsSaving(true);
    setError(null);
    try {
      await onSave(changes);
      const baseline = { ...latest.current.incoming };
      for (const change of changes) {
        if (change.targetQuantity === 0) delete baseline[change.articleId];
        else baseline[change.articleId] = change.targetQuantity;
      }
      setState({ locationId, baseline, values: createValues(articleIds, baseline) });
      return true;
    } catch (cause) { setError(cause instanceof Error ? cause : new Error("Änderungen konnten nicht gespeichert werden.")); return false; }
    finally { saving.current = false; setIsSaving(false); }
  }
  return { values: state.values, errors, dirtyIds, dirtyCount: dirtyIds.length, isDirty: dirtyIds.length > 0,
    isValid: Object.keys(errors).length === 0, isSaving, error, setValue, paste, discard, save };
}
