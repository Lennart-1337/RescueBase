import { useEffect, useRef, type PropsWithChildren } from "react";
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

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 3;
    context.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--color-text-primary").trim();
  }, [resolvedTheme]);

  return (
    <Panel className="signature-panel">
      <div className="panel-header">
        <div><h2>Unterschrift</h2></div>
        <Button onClick={clear} type="button" variant="ghost">Löschen</Button>
      </div>
      {children ? <div className="signature-panel-fields">{children}</div> : null}
      <canvas ref={canvasRef} aria-label="Unterschriftenfeld" height="220" onPointerCancel={endStroke} onPointerDown={startStroke} onPointerMove={drawStroke} onPointerUp={endStroke} width="640" />
    </Panel>
  );

  function startStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const point = toCanvasPoint(event);
    isDrawingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    context.beginPath();
    context.moveTo(point.x, point.y);
  }

  function drawStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const point = toCanvasPoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
    onChange(event.currentTarget.toDataURL("image/png"));
  }

  function endStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
    onChange(event.currentTarget.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  }
}

function toCanvasPoint(event: React.PointerEvent<HTMLCanvasElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (event.currentTarget.width / rect.width),
    y: (event.clientY - rect.top) * (event.currentTarget.height / rect.height)
  };
}
