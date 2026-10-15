import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { InventoryTarget } from "../../../lib/types";
import { useTargetGrid } from "./use-target-grid";

const target = (quantity: number) => ({ articleId: "a", locationId: "l", targetQuantity: quantity }) as InventoryTarget;
const defaults = { locationId: "l", articleIds: ["a", "b"], targets: [target(4)] };

describe("useTargetGrid", () => {
  it("preserves edits during refresh and reports original expected quantity", async () => {
    const onSave = vi.fn().mockResolvedValue([]);
    const { result, rerender } = renderHook((props) => useTargetGrid({ ...props, onSave }), { initialProps: defaults });
    act(() => result.current.setValue("a", "7"));
    rerender({ ...defaults, targets: [target(6)] });
    expect(result.current.values.a).toBe("7");
    await act(async () => { expect(await result.current.save()).toBe(true); });
    expect(onSave).toHaveBeenCalledWith([{ articleId: "a", targetQuantity: 7, expectedTargetQuantity: 4 }]);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.values.a).toBe("7");
  });
  it("uses null as expected quantity when editing a target cleared in the previous save", async () => {
    const onSave = vi.fn().mockResolvedValue([]);
    const { result } = renderHook(() => useTargetGrid({ ...defaults, onSave }));
    act(() => result.current.setValue("a", ""));
    await act(async () => { await result.current.save(); });
    act(() => result.current.setValue("a", "3"));
    await act(async () => { await result.current.save(); });
    expect(onSave).toHaveBeenLastCalledWith([{ articleId: "a", targetQuantity: 3, expectedTargetQuantity: null }]);
  });
  it("keeps drafts after a failed save and discards to latest known server values", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("Konflikt"));
    const { result, rerender } = renderHook((props) => useTargetGrid({ ...props, onSave }), { initialProps: defaults });
    act(() => result.current.setValue("a", "7"));
    rerender({ ...defaults, targets: [target(6)] });
    await act(async () => { expect(await result.current.save()).toBe(false); });
    expect(result.current.values.a).toBe("7");
    expect(result.current.error?.message).toBe("Konflikt");
    act(() => result.current.discard());
    expect(result.current.values.a).toBe("6");
  });
  it("applies paste atomically and prevents invalid saves", async () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useTargetGrid({ ...defaults, onSave }));
    act(() => { expect(result.current.paste(0, "8\n-2")).toBe(false); });
    expect(result.current.values).toEqual({ a: "4", b: "0" });
    act(() => result.current.setValue("b", "1.2"));
    await act(async () => { expect(await result.current.save()).toBe(false); });
    expect(result.current.errors.b).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });
  it("blocks edits and concurrent saves while a save is pending", async () => {
    let finish!: () => void;
    const onSave = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    const { result } = renderHook(() => useTargetGrid({ ...defaults, onSave }));
    act(() => result.current.setValue("a", "8"));
    let saving!: Promise<boolean>;
    act(() => { saving = result.current.save(); });
    act(() => result.current.setValue("a", "9"));
    expect(result.current.values.a).toBe("8");
    await act(async () => { expect(await result.current.save()).toBe(false); finish(); await saving; });
    expect(onSave).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.isSaving).toBe(false));
  });
});
