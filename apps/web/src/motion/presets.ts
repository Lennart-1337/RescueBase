import type { Variants } from "motion/react";
import { motionDistance, motionDurations, motionEase, type MotionMode } from "./tokens";

export function fadeVariants(_mode: MotionMode): Variants {
  return {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: motionDurations.base, ease: motionEase.standard } },
    exit: { opacity: 0, transition: { duration: motionDurations.fast, ease: motionEase.exit } }
  };
}

export function scaleFadeVariants(mode: MotionMode): Variants {
  if (mode === "reduced") {
    return fadeVariants(mode);
  }

  return {
    hidden: { opacity: 0, scale: 0.98, y: motionDistance.near },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: motionDurations.base, ease: motionEase.standard } },
    exit: { opacity: 0, scale: 0.99, y: motionDistance.near, transition: { duration: motionDurations.fast, ease: motionEase.exit } }
  };
}

export function slideUpVariants(mode: MotionMode): Variants {
  if (mode === "reduced") {
    return fadeVariants(mode);
  }

  return {
    hidden: { opacity: 0, y: motionDistance.medium },
    visible: { opacity: 1, y: 0, transition: { duration: motionDurations.base, ease: motionEase.standard } },
    exit: { opacity: 0, y: motionDistance.near, transition: { duration: motionDurations.fast, ease: motionEase.exit } }
  };
}

export function slideLeftVariants(mode: MotionMode): Variants {
  if (mode === "reduced") {
    return fadeVariants(mode);
  }

  return {
    hidden: { opacity: 0, x: motionDistance.medium },
    visible: { opacity: 1, x: 0, transition: { duration: motionDurations.slow, ease: motionEase.standard } },
    exit: { opacity: 0, x: motionDistance.medium, transition: { duration: motionDurations.fast, ease: motionEase.exit } }
  };
}

export function listItemVariants(mode: MotionMode): Variants {
  if (mode === "reduced") {
    return fadeVariants(mode);
  }

  return {
    hidden: { opacity: 0, y: 4 },
    visible: { opacity: 1, y: 0, transition: { duration: motionDurations.fast, ease: motionEase.standard } },
    exit: { opacity: 0, y: 4, transition: { duration: motionDurations.fast, ease: motionEase.exit } }
  };
}
