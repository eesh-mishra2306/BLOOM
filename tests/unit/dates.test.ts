import { describe, expect, it } from "vitest";
import { addDays, diffDays, isoFromDate, isValidIsoDate, compareIso } from "@/lib/dates";

describe("dates", () => {
  it("adds days across a month boundary", () => {
    expect(addDays("2026-02-27", 2)).toBe("2026-03-01");
  });

  it("subtracts days across a year boundary", () => {
    expect(addDays("2026-01-02", -3)).toBe("2025-12-30");
  });

  it("measures the days from a to b", () => {
    expect(diffDays("2026-01-01", "2026-01-29")).toBe(28);
    expect(diffDays("2026-01-29", "2026-01-01")).toBe(-28);
  });

  it("converts an instant to the local calendar day of a time zone", () => {
    // 20:00 UTC on 23 Nov is already 24 Nov in India (UTC+05:30)
    expect(isoFromDate(new Date("2026-11-23T20:00:00Z"), "Asia/Kolkata")).toBe("2026-11-24");
    expect(isoFromDate(new Date("2026-11-23T20:00:00Z"), "America/New_York")).toBe("2026-11-23");
  });

  it("validates ISO calendar dates", () => {
    expect(isValidIsoDate("2026-02-28")).toBe(true);
    expect(isValidIsoDate("2026-02-30")).toBe(false);
    expect(isValidIsoDate("26-2-3")).toBe(false);
  });

  it("orders ISO dates", () => {
    expect(compareIso("2026-01-01", "2026-01-02")).toBeLessThan(0);
    expect(compareIso("2026-01-02", "2026-01-02")).toBe(0);
  });
});
