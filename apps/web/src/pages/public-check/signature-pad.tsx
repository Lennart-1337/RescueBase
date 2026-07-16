import { useEffect, useRef, type PropsWithChildren, type TouchEvent } from "react";
import { useTheme } from "../../app/theme";
import { Button, Panel } from "../../components/ui";
import "./signature-pad.css";

export function SignaturePad({
  children,
  onChange
}: PropsWithChildren<{ onChange: (signature: string) => void }>) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const { resolvedTheme } = useTheme();
  const supportsPointerEvents = typeof window !== "undefined" && typeof window.PointerEvent === "function";

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    configureContext(context);
  }, [resolvedTheme]);

  return (
    <Panel className="signature-panel">
      <div className="panel-header">
        <div><h2>Unterschrift</h2></div>
        <Button onClick={clear} type="button" variant="ghost">Löschen</Button>
      </div>
      {children ? <div className="signature-panel-fields">{children}</div> : null}
      <canvas
        ref={canvasRef}
        aria-label="Unterschriftenfeld"
        height="220"
        onPointerCancel={supportsPointerEvents ? endStroke : undefined}
        onPointerDown={supportsPointerEvents ? startStroke : undefined}
        onPointerMove={supportsPointerEvents ? drawStroke : undefined}
        onPointerUp={supportsPointerEvents ? endStroke : undefined}
        onTouchEnd={supportsPointerEvents ? undefined : endTouchStroke}
        onTouchMove={supportsPointerEvents ? undefined : drawTouchStroke}
        onTouchStart={supportsPointerEvents ? undefined : startTouchStroke}
        width="640"
      />
    </Panel>
  );

  function startStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    startStrokeAt(event.currentTarget, event.clientX, event.clientY);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function drawStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    drawStrokeAt(event.currentTarget, event.clientX, event.clientY);
  }

  function endStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    onChange(event.currentTarget.toDataURL("image/png"));
  }

  function startTouchStroke(event: TouchEvent<HTMLCanvasElement>) {
    const touch = event.touches[0];
    if (!touch) return;
    startStrokeAt(event.currentTarget, touch.clientX, touch.clientY);
  }

  function drawTouchStroke(event: TouchEvent<HTMLCanvasElement>) {
    const touch = event.touches[0];
    if (!touch) return;
    drawStrokeAt(event.currentTarget, touch.clientX, touch.clientY);
  }

  function endTouchStroke(event: TouchEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    onChange(event.currentTarget.toDataURL("image/png"));
  }

  function startStrokeAt(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
    const context = canvas.getContext("2d");
    if (!context) return;
    configureContext(context);
    const point = toCanvasPoint(canvas, clientX, clientY);
    isDrawingRef.current = true;
    context.beginPath();
    context.moveTo(point.x, point.y);
  }

  function drawStrokeAt(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
    if (!isDrawingRef.current) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const point = toCanvasPoint(canvas, clientX, clientY);
    context.lineTo(point.x, point.y);
    context.stroke();
    onChange(canvas.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  }
}

function configureContext(context: CanvasRenderingContext2D) {
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = 3;
  context.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--color-text-primary").trim() || "#17202c";
}

function toCanvasPoint(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left) * (canvas.width / rect.width),
    y: (clientY - rect.top) * (canvas.height / rect.height)
  };
}
