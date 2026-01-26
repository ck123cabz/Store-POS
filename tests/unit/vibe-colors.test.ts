import { describe, it, expect } from "vitest";
import { getVibeColorClasses, getVibeLabel, type VibeLevel } from "@/lib/vibe-colors";

describe("getVibeColorClasses", () => {
  describe("standard vibe levels", () => {
    it('returns green classes for "Crushed it"', () => {
      const result = getVibeColorClasses("Crushed it");
      expect(result.background).toBe("bg-green-100");
      expect(result.border).toBe("border-green-400");
      expect(result.ring).toContain("ring-green");
    });

    it('returns light green classes for "Good"', () => {
      const result = getVibeColorClasses("Good");
      expect(result.background).toBe("bg-green-50");
      expect(result.border).toBe("border-green-200");
    });

    it('returns amber classes for "Meh"', () => {
      const result = getVibeColorClasses("Meh");
      expect(result.background).toBe("bg-amber-50");
      expect(result.border).toBe("border-amber-200");
    });

    it('returns orange classes for "Rough"', () => {
      const result = getVibeColorClasses("Rough");
      expect(result.background).toBe("bg-orange-100");
      expect(result.border).toBe("border-orange-400");
    });
  });

  describe("null or undefined vibe (no entry)", () => {
    it("returns neutral classes for null", () => {
      const result = getVibeColorClasses(null);
      expect(result.background).toBe("bg-background");
      expect(result.border).toBe("border-muted");
    });

    it("returns neutral classes for undefined", () => {
      const result = getVibeColorClasses(undefined);
      expect(result.background).toBe("bg-background");
      expect(result.border).toBe("border-muted");
    });
  });

  describe("edge cases", () => {
    it("handles case-insensitive vibe values", () => {
      const result1 = getVibeColorClasses("crushed it" as VibeLevel);
      const result2 = getVibeColorClasses("CRUSHED IT" as VibeLevel);
      const result3 = getVibeColorClasses("Crushed it");

      // All should return the same result
      expect(result1.background).toBe(result3.background);
      expect(result2.background).toBe(result3.background);
    });

    it("returns neutral classes for unknown vibe values", () => {
      const result = getVibeColorClasses("Unknown" as VibeLevel);
      expect(result.background).toBe("bg-background");
      expect(result.border).toBe("border-muted");
    });
  });
});

describe("getVibeLabel", () => {
  it("returns the vibe value when present", () => {
    expect(getVibeLabel("Crushed it")).toBe("Crushed it");
    expect(getVibeLabel("Meh")).toBe("Meh");
  });

  it('returns "No entry" for null or undefined', () => {
    expect(getVibeLabel(null)).toBe("No entry");
    expect(getVibeLabel(undefined)).toBe("No entry");
  });
});
