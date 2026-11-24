import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { DecryptError, open, seal, unwrapKey, wrapKey } from "@/lib/crypto/envelope";

const key = randomBytes(32);

describe("envelope encryption", () => {
  it("round-trips text", () => {
    const sealed = seal("flow: heavy, cramps: 3", key, "cycle_day:user-1");
    expect(open(sealed, key, "cycle_day:user-1")).toBe("flow: heavy, cramps: 3");
  });

  it("produces versioned ciphertext that does not contain the plaintext", () => {
    const sealed = seal("heavy", key, "cycle_day:user-1");
    expect(sealed.startsWith("v1.")).toBe(true);
    expect(sealed).not.toContain("heavy");
  });

  it("uses a fresh IV, so the same text seals differently each time", () => {
    expect(seal("same", key, "a")).not.toBe(seal("same", key, "a"));
  });

  it("refuses to open with a different associated context (row swapped between users)", () => {
    const sealed = seal("secret", key, "journal:user-1");
    expect(() => open(sealed, key, "journal:user-2")).toThrow(DecryptError);
  });

  it("refuses to open tampered ciphertext", () => {
    const sealed = seal("secret", key, "ctx");
    const [v, iv, body] = sealed.split(".");
    const bytes = Buffer.from(body, "base64url");
    bytes[0] ^= 0x01;
    expect(() => open(`${v}.${iv}.${bytes.toString("base64url")}`, key, "ctx")).toThrow(DecryptError);
  });

  it("refuses to open with the wrong key", () => {
    const sealed = seal("secret", key, "ctx");
    expect(() => open(sealed, randomBytes(32), "ctx")).toThrow(DecryptError);
  });

  it("wraps and unwraps a data key bound to its user", () => {
    const master = randomBytes(32);
    const dek = randomBytes(32);
    const wrapped = wrapKey(dek, master, "user-1");
    expect(unwrapKey(wrapped, master, "user-1").equals(dek)).toBe(true);
    expect(() => unwrapKey(wrapped, master, "user-2")).toThrow(DecryptError);
  });

  it("rejects malformed input instead of returning garbage", () => {
    expect(() => open("not-a-sealed-value", key, "ctx")).toThrow(DecryptError);
  });
});
