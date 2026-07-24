import { useState } from "react";
import { BookOpen, ChevronRight } from "lucide-react";
import { Button } from "../components/ui";
import "./night-shift-archive.css";

const findings = [
  "Ein einzelner Handschuh wartet weiterhin auf seine linke Hälfte.",
  "Drei Kabelbinder bilden eine stabile Zweckgemeinschaft.",
  "Der Kaffee wurde geprüft und ist weiterhin kein Medizinprodukt.",
  "Ein Etikett mit der Aufschrift „Wichtig“ wurde seiner Aufgabe gerecht.",
  "Ein verlorener Stift wurde neben einem anderen verlorenen Stift gefunden."
];

export function NightShiftArchive() {
  const [entry, setEntry] = useState(0);
  return (
    <section className="night-shift-archive" aria-labelledby="night-shift-title">
      <div className="night-shift-heading"><BookOpen /><div><span>Interne Ablage · nach Dienstschluss</span><h2 id="night-shift-title">Nachtschicht-Kartei</h2></div></div>
      <p>{findings[entry]}</p>
      <Button className="night-shift-next" onClick={() => setEntry((current) => (current + 1) % findings.length)} type="button" variant="ghost">Nächsten Fund blättern<ChevronRight data-icon="inline-end" /></Button>
    </section>
  );
}
