import { useState } from "react";
import { useBlocker } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { rescueBaseApi } from "../../../lib/api";
import type { Article, Batch, InventoryTarget, Location } from "../../../lib/types";
import { inventoryKeys } from "../../../queries/inventory";
import { useTargetGrid } from "./use-target-grid";

export type TargetGridProps = {
  articles: Article[];
  locations: Location[];
  targets: InventoryTarget[];
  batches: Batch[];
  initialLocationId?: string;
};
export function useGridEditor(props: TargetGridProps) {
  const [locationId, setLocationId] = useState(
    () =>
      props.locations.find(
        (location) => location.id === props.initialLocationId,
      )?.id ??
      props.locations[0]?.id ??
      "",
  );
  const [pendingLocation, setPendingLocation] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const queryClient = useQueryClient();
  const editor = useTargetGrid({
    locationId,
    articleIds: props.articles.map((article) => article.id),
    targets: props.targets,
    onSave: async (changes) => {
      try {
        const targets = await rescueBaseApi.updateInventoryTargets({
          locationId,
          changes,
        });
        queryClient.setQueryData(inventoryKeys.targets(), targets);
        setSaved(true);
      } finally {
        await queryClient.invalidateQueries({
          queryKey: inventoryKeys.targets(),
        });
      }
    },
  });
  const blocker = useBlocker({
    shouldBlockFn: () => editor.isDirty || editor.isSaving,
    enableBeforeUnload: editor.isDirty || editor.isSaving,
    withResolver: true,
  });
  const stock = new Map<string, number>();
  const now = Date.now();
  for (const batch of props.batches) {
    if (
      batch.locationId === locationId &&
      new Date(batch.expiresAt).getTime() > now &&
      batch.quantity > 0
    )
      stock.set(
        batch.articleId,
        (stock.get(batch.articleId) ?? 0) + batch.quantity,
      );
  }
  function requestLocation(id: string) {
    if (id === locationId) return;
    if (editor.isDirty) setPendingLocation(id);
    else {
      setLocationId(id);
      setSaved(false);
    }
  }
  function leave() {
    if (pendingLocation !== null) {
      setLocationId(pendingLocation);
      setPendingLocation(null);
      setSaved(false);
    } else if (blocker.status === "blocked") blocker.proceed();
  }
  function cancelLeave() {
    setPendingLocation(null);
    if (blocker.status === "blocked") blocker.reset();
  }
  function discard() {
    editor.discard();
    setSaved(false);
  }
  function discardAndLeave() {
    editor.discard();
    leave();
  }
  async function saveAndLeave() {
    if (await editor.save()) leave();
  }
  return { editor, locationId, stock, saved, requestLocation, cancelLeave, discard,
    discardAndLeave, saveAndLeave, leaveOpen: pendingLocation !== null || blocker.status === "blocked" };
}
