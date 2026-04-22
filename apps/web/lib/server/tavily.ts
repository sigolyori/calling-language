import { env } from "./env";

export interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score?: number;
  published_date?: string;
}

interface TavilyResponse {
  results?: TavilyResult[];
}

export async function searchTavily(
  query: string,
  options: { maxResults?: number } = {},
): Promise<TavilyResult[]> {
  if (!env.TAVILY_API_KEY) {
    console.log(`[Tavily STUB] query="${query}" — no TAVILY_API_KEY`);
    return [];
  }

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: env.TAVILY_API_KEY,
        query,
        topic: "news",
        days: 1,
        search_depth: "basic",
        max_results: options.maxResults ?? 5,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[Tavily] ${res.status}: ${body.slice(0, 200)}`);
      return [];
    }

    const data = (await res.json()) as TavilyResponse;
    return data.results ?? [];
  } catch (err) {
    console.error(`[Tavily] request failed for "${query}":`, err);
    return [];
  }
}
