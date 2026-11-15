/** How a held button repeats: first delay, then an interval that shrinks over time, and growing steps. */
export interface HoldProfile {
  readonly delay: number
  /** Interval (ms) after `elapsed` ms of holding. */
  readonly interval: (elapsed: number) => number
  /** Multiplier applied to each step after `elapsed` ms of holding. */
  readonly multiplier: (elapsed: number) => number
}

/** Mix parts: 350 ms, then 140 → 40 ms, double steps after 2.5 s. */
export const PARTS_HOLD: HoldProfile = {
  delay: 350,
  interval: (t) => Math.max(40, 140 - t / 15),
  multiplier: (t) => (t > 2500 ? 2 : 1),
}

/** Grid fine tuning: 350 ms, then 110 → 25 ms, ×2 after 1.5 s, ×5 after 3 s. */
export const FINE_HOLD: HoldProfile = {
  delay: 350,
  interval: (t) => Math.max(25, 110 - t / 20),
  multiplier: (t) => (t > 3000 ? 5 : t > 1500 ? 2 : 1),
}
