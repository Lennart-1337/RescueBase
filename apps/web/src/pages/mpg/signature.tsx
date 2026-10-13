import { useRef } from "react";
import { Button } from "../../components/ui";
export function Signature({ onChange }: { onChange: (value: string) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);
  return <div><p>Bitte persönlich im Feld unterschreiben.</p><canvas ref={canvas} className="mpg-signature" width={900} height={270} aria-label="Unterschriftsfeld" onPointerDown={(event) => {
    const node = canvas.current; const context = node?.getContext("2d"); if (!node || !context) return;
    const rect = node.getBoundingClientRect(); drawing.current = true; node.setPointerCapture(event.pointerId); context.beginPath(); context.strokeStyle = signatureInk(); context.lineWidth = 3;
    context.moveTo((event.clientX - rect.left) * node.width / rect.width, (event.clientY - rect.top) * node.height / rect.height);
  }} onPointerMove={(event) => {
    const node = canvas.current; const context = node?.getContext("2d"); if (!drawing.current || !node || !context) return;
    const rect = node.getBoundingClientRect(); context.lineTo((event.clientX - rect.left) * node.width / rect.width, (event.clientY - rect.top) * node.height / rect.height); context.stroke(); hasInk.current = true;
  }} onPointerUp={() => { drawing.current = false; if (hasInk.current && canvas.current) onChange(canvas.current.toDataURL("image/png")); }} onPointerCancel={() => { drawing.current = false; }} />
    <div><Button type="button" variant="ghost" onClick={() => { const node = canvas.current; node?.getContext("2d")?.clearRect(0, 0, node.width, node.height); hasInk.current = false; onChange(""); }}>Unterschrift löschen</Button></div></div>;
}

function signatureInk() { return getComputedStyle(document.documentElement).getPropertyValue("--color-text-primary").trim() || "#17202c"; }
