import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getDateRange,
  formatDateRangeLabel,
  isDateInRange,
  type DateRangeType,
  type DateRange,
} from "@/lib/date-ranges";

describe("getDateRange", () => {
  // Use a fixed date for consistent testing
  const fixedDate = new Date("2026-01-27T12:00:00.000Z"); // Tuesday, January 27, 2026

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Today", () => {
    it("returns start of today to end of today", () => {
      const range = getDateRange("Today");

      expect(range.start.getFullYear()).toBe(2026);
      expect(range.start.getMonth()).toBe(0); // January
      expect(range.start.getDate()).toBe(27);
      expect(range.start.getHours()).toBe(0);
      expect(range.start.getMinutes()).toBe(0);
      expect(range.start.getSeconds()).toBe(0);

      expect(range.end.getFullYear()).toBe(2026);
      expect(range.end.getMonth()).toBe(0);
      expect(range.end.getDate()).toBe(27);
      expect(range.end.getHours()).toBe(23);
      expect(range.end.getMinutes()).toBe(59);
      expect(range.end.getSeconds()).toBe(59);
    });
  });

  describe("Yesterday", () => {
    it("returns start of yesterday to end of yesterday", () => {
      const range = getDateRange("Yesterday");

      expect(range.start.getDate()).toBe(26);
      expect(range.end.getDate()).toBe(26);
      expect(range.start.getHours()).toBe(0);
      expect(range.end.getHours()).toBe(23);
    });
  });

  describe("This Week", () => {
    it("returns start of current week (Sunday) to end of today", () => {
      const range = getDateRange("This Week");

      // Week starts on Sunday, Jan 25, 2026
      expect(range.start.getDate()).toBe(25);
      expect(range.start.getHours()).toBe(0);

      // End is end of today (Jan 27)
      expect(range.end.getDate()).toBe(27);
      expect(range.end.getHours()).toBe(23);
    });
  });

  describe("Last Week", () => {
    it("returns full previous week (Sunday to Saturday)", () => {
      const range = getDateRange("Last Week");

      // Previous week: Sunday Jan 18 - Saturday Jan 24, 2026
      expect(range.start.getDate()).toBe(18);
      expect(range.start.getMonth()).toBe(0);
      expect(range.start.getHours()).toBe(0);

      expect(range.end.getDate()).toBe(24);
      expect(range.end.getMonth()).toBe(0);
      expect(range.end.getHours()).toBe(23);
    });
  });

  describe("This Month", () => {
    it("returns start of current month to end of today", () => {
      const range = getDateRange("This Month");

      expect(range.start.getMonth()).toBe(0); // January
      expect(range.start.getDate()).toBe(1);
      expect(range.start.getHours()).toBe(0);

      expect(range.end.getMonth()).toBe(0);
      expect(range.end.getDate()).toBe(27);
      expect(range.end.getHours()).toBe(23);
    });
  });

  describe("edge cases", () => {
    it("handles year boundary for Yesterday on Jan 1", () => {
      vi.setSystemTime(new Date("2026-01-01T12:00:00.000Z"));
      const range = getDateRange("Yesterday");

      expect(range.start.getFullYear()).toBe(2025);
      expect(range.start.getMonth()).toBe(11); // December
      expect(range.start.getDate()).toBe(31);
    });

    it("handles week starting on Sunday for This Week", () => {
      // Test when today is Sunday
      vi.setSystemTime(new Date("2026-01-25T12:00:00.000Z")); // Sunday
      const range = getDateRange("This Week");

      expect(range.start.getDate()).toBe(25);
      expect(range.end.getDate()).toBe(25);
    });

    it("handles first week of month for This Week", () => {
      vi.setSystemTime(new Date("2026-02-02T12:00:00.000Z")); // Monday Feb 2
      const range = getDateRange("This Week");

      // Week started Sunday Feb 1
      expect(range.start.getDate()).toBe(1);
      expect(range.start.getMonth()).toBe(1); // February
    });
  });
});

describe("formatDateRangeLabel", () => {
  it("returns descriptive label for each range type", () => {
    expect(formatDateRangeLabel("Today")).toBe("Today");
    expect(formatDateRangeLabel("Yesterday")).toBe("Yesterday");
    expect(formatDateRangeLabel("This Week")).toBe("This Week");
    expect(formatDateRangeLabel("Last Week")).toBe("Last Week");
    expect(formatDateRangeLabel("This Month")).toBe("This Month");
  });
});

describe("isDateInRange", () => {
  it("returns true if date is within range", () => {
    const range: DateRange = {
      start: new Date("2026-01-01T00:00:00"),
      end: new Date("2026-01-31T23:59:59"),
    };

    expect(isDateInRange(new Date("2026-01-15T12:00:00"), range)).toBe(true);
    expect(isDateInRange(new Date("2026-01-01T00:00:00"), range)).toBe(true);
    expect(isDateInRange(new Date("2026-01-31T23:59:59"), range)).toBe(true);
  });

  it("returns false if date is outside range", () => {
    const range: DateRange = {
      start: new Date("2026-01-01T00:00:00"),
      end: new Date("2026-01-31T23:59:59"),
    };

    expect(isDateInRange(new Date("2025-12-31T23:59:59"), range)).toBe(false);
    expect(isDateInRange(new Date("2026-02-01T00:00:00"), range)).toBe(false);
  });
});
