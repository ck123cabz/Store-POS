import { describe, it, expect } from "vitest";
import { formatBadgeCount, shouldShowBadge } from "@/lib/format-utils";

describe("formatBadgeCount", () => {
  describe("basic formatting", () => {
    it("returns the number as string for counts less than 100", () => {
      expect(formatBadgeCount(0)).toBe("0");
      expect(formatBadgeCount(1)).toBe("1");
      expect(formatBadgeCount(50)).toBe("50");
      expect(formatBadgeCount(99)).toBe("99");
    });

    it('returns "99+" for counts of 100 or more', () => {
      expect(formatBadgeCount(100)).toBe("99+");
      expect(formatBadgeCount(150)).toBe("99+");
      expect(formatBadgeCount(999)).toBe("99+");
      expect(formatBadgeCount(10000)).toBe("99+");
    });
  });

  describe("edge cases", () => {
    it("handles negative numbers by returning 0", () => {
      expect(formatBadgeCount(-1)).toBe("0");
      expect(formatBadgeCount(-100)).toBe("0");
    });

    it("handles non-integer values by rounding down", () => {
      expect(formatBadgeCount(5.7)).toBe("5");
      expect(formatBadgeCount(99.9)).toBe("99");
      expect(formatBadgeCount(100.1)).toBe("99+");
    });
  });
});

describe("shouldShowBadge", () => {
  // EC-08: Badge count is 0 hides badge
  it("returns false for count of 0", () => {
    expect(shouldShowBadge(0)).toBe(false);
  });

  it("returns true for count greater than 0", () => {
    expect(shouldShowBadge(1)).toBe(true);
    expect(shouldShowBadge(99)).toBe(true);
    expect(shouldShowBadge(100)).toBe(true);
  });

  it("returns false for negative counts", () => {
    expect(shouldShowBadge(-1)).toBe(false);
  });
});
