export const motionDurations = {
  fast: 0.12,
  base: 0.18,
  slow: 0.22
} as const;

export const motionDistance = {
  near: 8,
  medium: 16
} as const;

export const motionEase = {
  standard: [0.2, 0.8, 0.2, 1],
  exit: [0.4, 0, 1, 1]
} as const;

export type MotionMode = "full" | "reduced";
