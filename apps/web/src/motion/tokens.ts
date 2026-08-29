export const motionDurations = {
  fast: 0.14,
  base: 0.24,
  slow: 0.3
} as const;

export const motionDistance = {
  near: 10,
  medium: 18
} as const;

export const motionEase = {
  standard: [0.2, 0.8, 0.2, 1],
  exit: [0.4, 0, 1, 1]
} as const;

export const motionStagger = {
  list: 0.05,
  fast: 0.03
} as const;

export type MotionMode = "full" | "reduced";
