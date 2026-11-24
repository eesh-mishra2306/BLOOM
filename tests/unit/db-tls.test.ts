import { describe, expect, it } from "vitest";
import { withVerifiedTls } from "@/lib/db/tls";

describe("withVerifiedTls", () => {
  it("spells sslmode=require as verify-full and keeps the other parameters", () => {
    expect(withVerifiedTls("postgresql://bloom:secret@ep-x.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require")).toBe(
      "postgresql://bloom:secret@ep-x.ap-southeast-1.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require",
    );
  });

  it("does the same for prefer and verify-ca, wherever sslmode sits in the query", () => {
    expect(withVerifiedTls("postgres://u:p@h/db?sslmode=prefer")).toBe("postgres://u:p@h/db?sslmode=verify-full");
    expect(withVerifiedTls("postgres://u:p@h/db?application_name=bloom&sslmode=verify-ca")).toBe("postgres://u:p@h/db?application_name=bloom&sslmode=verify-full");
  });

  it("leaves other modes and URLs without sslmode alone", () => {
    for (const url of [
      "postgres://postgres@localhost:5432/bloom",
      "postgres://u:p@h/db?sslmode=verify-full",
      "postgres://u:p@h/db?sslmode=disable",
      "postgres://u:p@h/db?sslmode=no-verify",
    ]) {
      expect(withVerifiedTls(url)).toBe(url);
    }
  });

  it("never rewrites text outside the query string", () => {
    const url = "postgres://u:a&sslmode=require@h/db";
    expect(withVerifiedTls(url)).toBe(url);
  });
});
