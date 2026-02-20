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
    background: "bg-status-ok/15",
    border: "border-status-ok/40",
    ring: "ring-1 ring-status-ok/40",
    text: "text-status-ok",
    bg: "bg-status-ok/15",
    dot: "bg-status-ok",
  },
  good: {
    background: "bg-status-ok/10",
    border: "border-status-ok/30",
    ring: "ring-1 ring-status-ok/30",
    text: "text-status-ok",
    bg: "bg-status-ok/10",
    dot: "bg-status-ok/80",
  },
  meh: {
    background: "bg-status-warning/10",
    border: "border-status-warning/30",
    ring: "ring-1 ring-status-warning/30",
    text: "text-status-warning",
    bg: "bg-status-warning/10",
    dot: "bg-status-warning/80",
  },
  rough: {
    background: "bg-status-critical/15",
    border: "border-status-critical/40",
    ring: "ring-1 ring-status-critical/40",
    text: "text-status-critical",
    bg: "bg-status-critical/15",
    dot: "bg-status-critical",
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
