import { useEffect, useState } from "react";
import type { MotionMode } from "./tokens";

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && "matchMedia" in window
    ? window.matchMedia(reducedMotionQuery).matches
    : false;
}

export function useMotionMode(): MotionMode {
  const [reduced, setReduced] = useState(prefersReducedMotion);

  useEffect(() => {
    if (!("matchMedia" in window)) {
      return undefined;
    }

    const mediaQuery = window.matchMedia(reducedMotionQuery);
    const update = () => setReduced(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return reduced ? "reduced" : "full";
}
