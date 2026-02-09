"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

type MarketSource = {
  url: string;
  title: string;
  snippet: string;
  sourceType: "search";
  query: string;
};

function decodeHtml(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(input: string): string {
  return input.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function extractResultsFromDuckDuckGo(html: string, query: string): MarketSource[] {
  const blocks = [...html.matchAll(/<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g)];
  return blocks
    .map((match) => {
      const rawUrl = decodeHtml(match[1] ?? "");
      const title = stripTags(decodeHtml(match[2] ?? ""));
      const snippet = stripTags(decodeHtml(match[3] ?? ""));
      const url = rawUrl.startsWith("//") ? `https:${rawUrl}` : rawUrl;
      if (!url || !title || !snippet) return null;
      return {
        url,
        title,
        snippet,
        sourceType: "search" as const,
        query
      };
    })
    .filter((item): item is MarketSource => Boolean(item));
}

export const collectMarketSources = action({
  args: {
    niche: v.string(),
    geo: v.string(),
    language: v.string(),
    maxSources: v.optional(v.number())
  },
  handler: async (_ctx, args): Promise<{ sources: MarketSource[]; provider: string }> => {
    const queries = [
      `${args.niche} competitors ${args.geo}`,
      `${args.niche} pricing alternatives ${args.language}`,
      `${args.niche} reviews users pain points`,
      `${args.niche} best tools comparison`
    ];

    const maxSources = args.maxSources ?? 16;
    const collected: MarketSource[] = [];

    for (const query of queries) {
      const params = new URLSearchParams({ q: query, kl: "wt-wt" });
      const response = await fetch(`https://html.duckduckgo.com/html/?${params.toString()}`, {
        method: "GET",
        headers: {
          "User-Agent": "VentureOS/1.0 (+research collector)"
        }
      });

      if (!response.ok) continue;
      const html = await response.text();
      const parsed = extractResultsFromDuckDuckGo(html, query);
      for (const item of parsed) {
        if (collected.length >= maxSources) break;
        if (collected.some((existing) => existing.url === item.url)) continue;
        collected.push(item);
      }
      if (collected.length >= maxSources) break;
    }

    return { sources: collected, provider: "duckduckgo_html" };
  }
});
