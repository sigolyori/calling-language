import { Anthropic } from "@anthropic-ai/sdk";
import { env } from "./env";

let cached: Anthropic | null = null;

export function getAnthropic(): Anthropic | null {
  if (!env.ANTHROPIC_API_KEY) return null;
  if (!cached) cached = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return cached;
}

export const HAIKU_MODEL = "claude-haiku-4-5-20251001";
export const SONNET_MODEL = "claude-sonnet-4-6";

export function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}
