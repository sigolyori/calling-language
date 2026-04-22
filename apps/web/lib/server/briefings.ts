import { z } from "zod";
import { prisma } from "./prisma";
import { getAnthropic, HAIKU_MODEL, stripJsonFences } from "./anthropic";
import { searchTavily } from "./tavily";
import {
  BRIEFING_CURATOR_SYSTEM,
  buildBriefingCuratorUserPrompt,
} from "./prompts/briefing-curator";

export type BriefingCategory =
  | "korea"
  | "global"
  | "k-culture"
  | "tech"
  | "sports"
  | "seasonal";

export interface BriefingItem {
  category: BriefingCategory;
  headline: string;
  context: string;
  why_relevant: string;
}

export interface DailyBriefingJson {
  weather_seoul: string;
  items: BriefingItem[];
  conversation_starters: string[];
}

const briefingItemSchema = z.object({
  category: z.enum(["korea", "global", "k-culture", "tech", "sports", "seasonal"]),
  headline: z.string(),
  context: z.string(),
  why_relevant: z.string(),
});

const briefingSchema = z.object({
  weather_seoul: z.string(),
  items: z.array(briefingItemSchema),
  conversation_starters: z.array(z.string()),
});

const SEARCH_QUERIES: { category: BriefingCategory; query: string }[] = [
  {
    category: "korea",
    query: "Korea news today economy business society culture (not politics, not election)",
  },
  { category: "global", query: "world news top stories today" },
  { category: "k-culture", query: "K-pop K-drama Korean entertainment news this week" },
  { category: "tech", query: "technology AI news today" },
  { category: "sports", query: "sports news today major events results" },
  { category: "seasonal", query: "Seoul weather today season lifestyle" },
];

export function kstDateString(now: Date = new Date()): string {
  const kstMs = now.getTime() + 9 * 60 * 60 * 1000;
  return new Date(kstMs).toISOString().slice(0, 10);
}

export async function loadBriefing(kstDate: string): Promise<DailyBriefingJson | null> {
  const row = await prisma.dailyBriefing.findUnique({ where: { date: kstDate } });
  if (!row) return null;
  return {
    weather_seoul: row.weatherSeoul,
    items: row.items as unknown as BriefingItem[],
    conversation_starters: row.conversationStarters as unknown as string[],
  };
}

export async function loadTodayBriefing(): Promise<DailyBriefingJson | null> {
  return loadBriefing(kstDateString());
}

async function upsertBriefing(kstDate: string, data: DailyBriefingJson): Promise<void> {
  await prisma.dailyBriefing.upsert({
    where: { date: kstDate },
    create: {
      date: kstDate,
      weatherSeoul: data.weather_seoul,
      items: data.items as object,
      conversationStarters: data.conversation_starters as object,
    },
    update: {
      weatherSeoul: data.weather_seoul,
      items: data.items as object,
      conversationStarters: data.conversation_starters as object,
      generatedAt: new Date(),
    },
  });
}

async function collectSources() {
  return Promise.all(
    SEARCH_QUERIES.map(async ({ category, query }) => ({
      category,
      results: await searchTavily(query, { maxResults: 5 }),
    })),
  );
}

export async function generateAndStoreBriefing(): Promise<
  { date: string; itemCount: number } | { skipped: string }
> {
  const client = getAnthropic();
  if (!client) return { skipped: "missing ANTHROPIC_API_KEY" };

  const kstDate = kstDateString();
  const sources = await collectSources();
  const totalResults = sources.reduce((n, b) => n + b.results.length, 0);
  if (totalResults === 0) return { skipped: "no tavily results (check TAVILY_API_KEY)" };

  const userPrompt = buildBriefingCuratorUserPrompt(sources, kstDate);
  const msg = await client.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 2048,
    system: BRIEFING_CURATOR_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });

  console.log(
    `[Briefing tokens] date=${kstDate} input=${msg.usage.input_tokens} output=${msg.usage.output_tokens}`,
  );

  const content = msg.content[0];
  if (content.type !== "text") throw new Error("[Briefing] Unexpected response type");

  const cleaned = stripJsonFences(content.text);
  const parsed = briefingSchema.parse(JSON.parse(cleaned));
  await upsertBriefing(kstDate, parsed);

  console.log(`[Briefing] Stored ${parsed.items.length} items for ${kstDate}`);
  return { date: kstDate, itemCount: parsed.items.length };
}
