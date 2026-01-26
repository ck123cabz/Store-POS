/**
 * Vibe-to-color mapping utilities
 * Used for calendar day color coding based on DailyPulse vibe
 */

export type VibeLevel = "Crushed it" | "Good" | "Meh" | "Rough" | null | undefined;

export interface VibeColorClasses {
  background: string;
  border: string;
  ring?: string;
  text?: string;
  /** Shorthand for background (used in calendar) */
  bg: string;
  /** Indicator dot color */
  dot: string;
}

/**
 * Maps vibe levels to Tailwind CSS classes
 * Based on Visual Design Specifications in spec.md
 */
const VIBE_COLOR_MAP: Record<string, VibeColorClasses> = {
  "crushed it": {
    background: "bg-green-100",
    border: "border-green-400",
    ring: "ring-1 ring-green-400",
    text: "text-green-800",
    bg: "bg-green-100",
    dot: "bg-green-500",
  },
  good: {
    background: "bg-green-50",
    border: "border-green-200",
    ring: "ring-1 ring-green-200",
    text: "text-green-700",
    bg: "bg-green-50",
    dot: "bg-green-400",
  },
  meh: {
    background: "bg-amber-50",
    border: "border-amber-200",
    ring: "ring-1 ring-amber-200",
    text: "text-amber-700",
    bg: "bg-amber-50",
    dot: "bg-amber-400",
  },
  rough: {
    background: "bg-orange-100",
    border: "border-orange-400",
    ring: "ring-1 ring-orange-400",
    text: "text-orange-800",
    bg: "bg-orange-100",
    dot: "bg-orange-500",
  },
};

const NEUTRAL_COLORS: VibeColorClasses = {
  background: "bg-background",
  border: "border-muted",
  ring: "",
  text: "text-muted-foreground",
  bg: "bg-background",
  dot: "bg-muted-foreground",
};

/**
 * Gets Tailwind CSS classes for a vibe level
 * Returns neutral classes for null/undefined/unknown values
 *
 * @param vibe - The vibe level from DailyPulse
 * @returns Object containing background, border, and optional ring classes
 */
export function getVibeColorClasses(vibe: VibeLevel): VibeColorClasses {
  if (vibe === null || vibe === undefined) {
    return NEUTRAL_COLORS;
  }

  const normalizedVibe = vibe.toLowerCase();
  return VIBE_COLOR_MAP[normalizedVibe] || NEUTRAL_COLORS;
}

/**
 * Gets a human-readable label for the vibe level
 * Returns "No entry" for null/undefined
 *
 * @param vibe - The vibe level from DailyPulse
 * @returns Human-readable label
 */
export function getVibeLabel(vibe: VibeLevel): string {
  if (vibe === null || vibe === undefined) {
    return "No entry";
  }
  return vibe;
}

/**
 * Gets combined class string for calendar day styling
 *
 * @param vibe - The vibe level from DailyPulse
 * @returns Combined Tailwind class string
 */
export function getVibeClassString(vibe: VibeLevel): string {
  const classes = getVibeColorClasses(vibe);
  return [classes.background, classes.border, classes.ring]
    .filter(Boolean)
    .join(" ");
}
