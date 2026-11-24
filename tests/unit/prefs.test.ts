import { describe, expect, it } from "vitest";
import { DEFAULT_PREFS, isNavActive, navItems, resolveAttributes } from "@/lib/prefs/model";

const env = { prefersDark: false, prefersReducedMotion: false };

describe("resolveAttributes", () => {
  it("follows the system theme and motion by default", () => {
    expect(resolveAttributes(DEFAULT_PREFS, { prefersDark: true, prefersReducedMotion: true })).toMatchObject({
      theme: "dark",
      motion: "reduced",
      discreet: false,
    });
  });

  it("keeps discreet mode light even when dark is chosen", () => {
    expect(resolveAttributes({ ...DEFAULT_PREFS, theme: "dark", discreet: true }, env).theme).toBe("light");
  });

  it("lets the user force full motion over the system setting", () => {
    expect(resolveAttributes({ ...DEFAULT_PREFS, motion: "full" }, { ...env, prefersReducedMotion: true }).motion).toBe("full");
  });

  it("clamps text scale to the supported range", () => {
    expect(resolveAttributes({ ...DEFAULT_PREFS, textScale: 3 as never }, env).textScale).toBe(1);
  });
});

describe("navItems", () => {
  it("lists the five app sections", () => {
    expect(navItems(false).map((i) => i.href)).toEqual(["/dashboard", "/cycle", "/bloomverse", "/wellness", "/safety"]);
  });

  it("uses neutral words in discreet mode without changing destinations", () => {
    const discreet = navItems(true);
    expect(discreet.map((i) => i.label)).toEqual(["Home", "Calendar", "Garden", "Notes", "Help"]);
    expect(discreet.map((i) => i.href)).toEqual(navItems(false).map((i) => i.href));
  });
});

describe("isNavActive", () => {
  const shield = navItems(false).find((i) => i.href === "/safety")!;
  it("treats journeys as part of Shield", () => {
    expect(isNavActive(shield, "/safety")).toBe(true);
    expect(isNavActive(shield, "/journey")).toBe(true);
    expect(isNavActive(shield, "/journeys-elsewhere")).toBe(false);
    expect(isNavActive(shield, "/dashboard")).toBe(false);
  });
});
