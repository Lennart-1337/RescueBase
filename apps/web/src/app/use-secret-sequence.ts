import { useEffect } from "react";

export function useSecretSequence(sequence: string, onMatch: () => void) {
  useEffect(() => {
    let progress = 0;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.length !== 1) return;
      const key = event.key.toLocaleLowerCase("de-DE");
      progress = key === sequence[progress] ? progress + 1 : key === sequence[0] ? 1 : 0;
      if (progress === sequence.length) {
        onMatch();
        progress = 0;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onMatch, sequence]);
}
