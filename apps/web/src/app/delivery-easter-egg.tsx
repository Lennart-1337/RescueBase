import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Package, RotateCcw, Truck } from "lucide-react";
import { Button } from "../components/ui";
import "./delivery-easter-egg.css";

const laneCount = 7;

type Cargo = { id: number; lane: number; progress: number };

export function DeliveryEasterEgg() {
  const [cargo, setCargo] = useState<Cargo>(createCargo(0));
  const [lane, setLane] = useState(3);
  const [isRunning, setIsRunning] = useState(false);
  const [misses, setMisses] = useState(0);
  const [score, setScore] = useState(0);
  const gameOver = misses >= 3;

  useEffect(() => {
    if (!isRunning || gameOver) return;
    const timer = window.setInterval(() => {
      setCargo((current) => {
        if (current.progress < 84) return { ...current, progress: current.progress + 3 };
        if (current.lane === lane) setScore((value) => value + 1);
        else setMisses((value) => value + 1);
        return createCargo(current.id + 1);
      });
    }, Math.max(70, 150 - score * 4));
    return () => window.clearInterval(timer);
  }, [gameOver, isRunning, lane, score]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!isRunning || gameOver) return;
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "ArrowRight") move(1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [gameOver, isRunning]);

  function move(direction: -1 | 1) {
    setLane((current) => Math.max(0, Math.min(laneCount - 1, current + direction)));
  }

  function start() {
    setCargo(createCargo(0));
    setLane(3);
    setMisses(0);
    setScore(0);
    setIsRunning(true);
  }

  return (
    <section className="delivery-easter-egg" aria-labelledby="delivery-game-title">
      <div className="delivery-game-heading">
        <div><span>Inoffizielle Schicht</span><h2 id="delivery-game-title">Packwagen-Express</h2></div>
        <strong aria-live="polite">Punkte: {score}</strong>
      </div>
      <p>{gameOver ? "Drei Kisten sind liegen geblieben. Neue Runde?" : "Fang die Kisten ab – mit Pfeiltasten oder den Steuertasten."}</p>
      <div className="delivery-game-board" role="application" aria-label="Packwagen-Express">
        <div className="delivery-cargo" style={{ left: `${cargo.lane * (100 / laneCount) + 3}%`, top: `${cargo.progress}%` }}><Package /></div>
        <div className="delivery-truck" style={{ left: `${lane * (100 / laneCount) + 2}%` }}><Truck /></div>
      </div>
      <div className="delivery-game-controls">
        <Button aria-label="Nach links fahren" disabled={!isRunning || gameOver} onClick={() => move(-1)} type="button" variant="secondary"><ChevronLeft /></Button>
        {!isRunning || gameOver ? <Button onClick={start} type="button"><RotateCcw data-icon="inline-start" />{gameOver ? "Nochmal fahren" : "Spiel starten"}</Button> : <span>Fehlwürfe: {misses}/3</span>}
        <Button aria-label="Nach rechts fahren" disabled={!isRunning || gameOver} onClick={() => move(1)} type="button" variant="secondary"><ChevronRight /></Button>
      </div>
    </section>
  );
}

function createCargo(id: number): Cargo {
  return { id, lane: (id * 5 + 2) % laneCount, progress: 0 };
}
