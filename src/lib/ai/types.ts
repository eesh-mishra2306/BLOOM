import type { UIMessage } from "ai";
import type { Resource } from "./triage";

export type SafetyData = { level: "urgent_medical" | "crisis" | "danger"; headline: string; resources: Resource[] };
export type SourcesData = { items: { id: string; title: string; publisher: string; url: string }[] };
export type NoticeData = { code: "ai_not_configured" | "ai_error"; message: string };

export type BloomUIMessage = UIMessage<never, { safety: SafetyData; sources: SourcesData; notice: NoticeData }>;
