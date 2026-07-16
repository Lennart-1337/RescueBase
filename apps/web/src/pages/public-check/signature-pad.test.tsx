import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../app/theme";
import { SignaturePad } from "./signature-pad";

describe("SignaturePad", () => {
  it("draws with the touch fallback when PointerEvent is unavailable", () => {
    const onChange = vi.fn();
    const originalPointerEvent = window.PointerEvent;
    Object.defineProperty(window, "PointerEvent", { configurable: true, value: undefined });
    const { container } = render(
      <ThemeProvider>
        <SignaturePad onChange={onChange} />
      </ThemeProvider>
    );
    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      bottom: 220,
      height: 220,
      left: 0,
      right: 640,
      top: 0,
      width: 640,
      x: 0,
      y: 0,
      toJSON: () => ({})
    });

    fireEvent.touchStart(canvas, { touches: [{ clientX: 10, clientY: 20 }] });
    fireEvent.touchMove(canvas, { touches: [{ clientX: 40, clientY: 50 }] });
    fireEvent.touchEnd(canvas, { touches: [] });

    expect(onChange).toHaveBeenLastCalledWith("data:image/png;base64,test-signature");
    Object.defineProperty(window, "PointerEvent", { configurable: true, value: originalPointerEvent });
  });
});
