import { describe, expect, it } from "vitest";
import { COUNTRIES, emergencyFor, isSupportedCountry } from "@/lib/safety/emergency-numbers";

describe("emergency numbers", () => {
  it("uses 112 for India with the women's helpline and Tele-MANAS as extras", () => {
    const india = emergencyFor("IN");
    expect(india.emergency).toBe("112");
    expect(india.extras.map((e) => e.number)).toEqual(expect.arrayContaining(["181", "14416"]));
  });

  it("falls back to 112 with a check-your-local-number note for unknown countries", () => {
    const other = emergencyFor("ZZ");
    expect(other.emergency).toBe("112");
    expect(other.note).toMatch(/local/i);
  });

  it("knows the common numbers outside India", () => {
    expect(emergencyFor("US").emergency).toBe("911");
    expect(emergencyFor("GB").emergency).toBe("999");
    expect(emergencyFor("AU").emergency).toBe("000");
  });

  it("only accepts countries it has numbers for", () => {
    expect(isSupportedCountry("IN")).toBe(true);
    expect(isSupportedCountry("ZZ")).toBe(false);
    expect(COUNTRIES[0].code).toBe("IN");
  });
});
