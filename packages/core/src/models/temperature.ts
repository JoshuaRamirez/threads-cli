/**
 * Temperature computation module.
 *
 * Temperature is derived from updatedAt timestamp, not stored.
 * This provides automatic momentum indication based on recency.
 */

import { Temperature } from './types';

/**
 * Thresholds for computing temperature from recency.
 * Ordered from most recent (hot) to least recent (frozen).
 */
export const TEMPERATURE_THRESHOLDS = [
  { maxDays: 1, temperature: 'hot' as Temperature },
  { maxDays: 3, temperature: 'warm' as Temperature },
  { maxDays: 7, temperature: 'tepid' as Temperature },
  { maxDays: 14, temperature: 'cold' as Temperature },
  { maxDays: 30, temperature: 'freezing' as Temperature },
  { maxDays: Infinity, temperature: 'frozen' as Temperature },
] as const;

/**
 * Temperature ordering from hottest to coldest.
 * Useful for sorting and comparison.
 */
export const TEMPERATURE_ORDER: Temperature[] = ['hot', 'warm', 'tepid', 'cold', 'freezing', 'frozen'];

/**
 * Compute temperature from updatedAt timestamp.
 *
 * @param updatedAt - ISO timestamp of last update
 * @param now - Current time (injectable for testing)
 * @returns Computed temperature based on recency
 */
export function computeTemperature(updatedAt: string, now: Date = new Date()): Temperature {
  const diffMs = now.getTime() - new Date(updatedAt).getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  for (const { maxDays, temperature } of TEMPERATURE_THRESHOLDS) {
    if (diffDays <= maxDays) {
      return temperature;
    }
  }

  return 'frozen';
}
