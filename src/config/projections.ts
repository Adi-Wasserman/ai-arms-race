import type { UncertaintyBand } from '@/types';

/** Projection end date for the 2029 Jan target model. */
export const PROJ_END: string = '2029-01-01';

/**
 * Uncertainty band used by buildProjections2029.
 * Base ±8%, widens by 6% per year from "today" to projEnd.
 * Roughly ±24% at Jan 2029 from Q1 2026.
 */
export const PROJ_UNCERTAINTY: UncertaintyBand = {
  base: 0.08,
  perYear: 0.06,
} as const;

/**
 * Ease-out exponent used for target interpolation between "today" and projEnd.
 * value = today + (target - today) * (1 - (1 - t) ** EASE_OUT_EXPONENT)
 * 1.8 matches the observed deceleration of compute buildout.
 */
export const EASE_OUT_EXPONENT: number = 1.8;
