import { beforeEach, describe, expect, it } from "vitest";
import { saveJournal } from "@/lib/wellness/repo";
import { resetDb, signUp } from "./helpers";

const { GET } = await import("@/app/api/journal/export/route");

describe("journal export", () => {
  beforeEach(resetDb);

  it("refuses anonymous requests", async () => {
    const res = await GET(new Request("http://localhost:3000/api/journal/export"));
    expect(res.status).toBe(401);
  });

  it("downloads every entry as a Markdown file", async () => {
    const { cookie, userId } = await signUp();
    await saveJournal(userId, { title: "Monday", body: "Talked to Didi." });
    await saveJournal(userId, { body: "Quiet day." });
    const res = await GET(new Request("http://localhost:3000/api/journal/export", { headers: { cookie } }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/markdown/);
    expect(res.headers.get("content-disposition")).toMatch(/attachment; filename="bloom-journal-\d{4}-\d{2}-\d{2}\.md"/);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const text = await res.text();
    expect(text).toContain("## Monday");
    expect(text).toContain("Talked to Didi.");
    expect(text).toContain("Quiet day.");
  });
});
