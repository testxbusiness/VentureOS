"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

type Provider = "openai" | "anthropic";

type Usage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

type GatewayResult = {
  provider: Provider;
  model: string;
  output: unknown;
  rawText: string;
  usage: Usage;
  attempts: number;
  costEstimateUsd: number;
};

function getProviderConfig(provider: Provider) {
  if (provider === "openai") {
    return {
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini"
    };
  }
  return {
    apiKey: process.env.ANTHROPIC_API_KEY,
    baseUrl: process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com/v1",
    model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest"
  };
}

function pickProviderAndModel(provider?: Provider, model?: string) {
  const selectedProvider: Provider = provider ?? (process.env.OPENAI_API_KEY ? "openai" : "anthropic");
  const cfg = getProviderConfig(selectedProvider);
  if (!cfg.apiKey) {
    throw new Error(`Missing API key for provider ${selectedProvider}`);
  }
  return {
    provider: selectedProvider,
    model: model ?? cfg.model,
    apiKey: cfg.apiKey,
    baseUrl: cfg.baseUrl
  };
}

function parseJsonStrict(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Model returned non-JSON output");
  }
}

function estimateCostUsd(provider: Provider, usage: Usage): number {
  const rates =
    provider === "openai"
      ? { inputPerM: 0.8, outputPerM: 3.2 }
      : { inputPerM: 3.0, outputPerM: 15.0 };
  const inputCost = (usage.inputTokens / 1_000_000) * rates.inputPerM;
  const outputCost = (usage.outputTokens / 1_000_000) * rates.outputPerM;
  return Number((inputCost + outputCost).toFixed(6));
}

async function callOpenAI(args: {
  apiKey: string;
  baseUrl: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  schema: unknown;
  temperature: number;
  maxOutputTokens: number;
  timeoutMs: number;
}): Promise<{ rawText: string; usage: Usage }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), args.timeoutMs);
  try {
    const response = await fetch(`${args.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.apiKey}`,
        "Content-Type": "application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: args.model,
        temperature: args.temperature,
        max_tokens: args.maxOutputTokens,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "structured_output",
            strict: true,
            schema: args.schema
          }
        },
        messages: [
          { role: "system", content: args.systemPrompt },
          { role: "user", content: args.userPrompt }
        ]
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenAI error ${response.status}: ${body}`);
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };
    const rawText = json.choices?.[0]?.message?.content ?? "";
    const inputTokens = json.usage?.prompt_tokens ?? 0;
    const outputTokens = json.usage?.completion_tokens ?? 0;
    const totalTokens = json.usage?.total_tokens ?? inputTokens + outputTokens;
    return { rawText, usage: { inputTokens, outputTokens, totalTokens } };
  } finally {
    clearTimeout(timeout);
  }
}

async function callAnthropic(args: {
  apiKey: string;
  baseUrl: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  schema: unknown;
  temperature: number;
  maxOutputTokens: number;
  timeoutMs: number;
}): Promise<{ rawText: string; usage: Usage }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), args.timeoutMs);
  try {
    const schemaHint = JSON.stringify(args.schema);
    const response = await fetch(`${args.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "x-api-key": args.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: args.model,
        temperature: args.temperature,
        max_tokens: args.maxOutputTokens,
        system:
          `${args.systemPrompt}\n` +
          "Return only valid JSON. Do not include markdown fences.\n" +
          `JSON schema: ${schemaHint}`,
        messages: [{ role: "user", content: args.userPrompt }]
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Anthropic error ${response.status}: ${body}`);
    }

    const json = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const rawText = json.content?.find((item) => item.type === "text")?.text ?? "";
    const inputTokens = json.usage?.input_tokens ?? 0;
    const outputTokens = json.usage?.output_tokens ?? 0;
    const totalTokens = inputTokens + outputTokens;
    return { rawText, usage: { inputTokens, outputTokens, totalTokens } };
  } finally {
    clearTimeout(timeout);
  }
}

export const health = action({
  args: {},
  handler: async () => {
    const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
    const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY);
    return {
      providers: {
        openai: {
          configured: hasOpenAI,
          model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini"
        },
        anthropic: {
          configured: hasAnthropic,
          model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest"
        }
      },
      defaultProvider: hasOpenAI ? "openai" : hasAnthropic ? "anthropic" : null
    };
  }
});

export const generateStructured = action({
  args: {
    runId: v.optional(v.id("ventureRuns")),
    provider: v.optional(v.union(v.literal("openai"), v.literal("anthropic"))),
    model: v.optional(v.string()),
    systemPrompt: v.string(),
    userPrompt: v.string(),
    schema: v.any(),
    temperature: v.optional(v.number()),
    maxOutputTokens: v.optional(v.number()),
    timeoutMs: v.optional(v.number()),
    retries: v.optional(v.number()),
    actor: v.optional(v.string()),
    metadata: v.optional(v.any())
  },
  handler: async (ctx, args): Promise<GatewayResult> => {
    const temperature = args.temperature ?? 0.2;
    const maxOutputTokens = args.maxOutputTokens ?? 1200;
    const timeoutMs = args.timeoutMs ?? 20000;
    const retries = args.retries ?? 2;
    const actor = args.actor ?? "llm_gateway";

    const selected = pickProviderAndModel(args.provider, args.model);
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        const callArgs = {
          apiKey: selected.apiKey,
          baseUrl: selected.baseUrl,
          model: selected.model,
          systemPrompt: args.systemPrompt,
          userPrompt: args.userPrompt,
          schema: args.schema,
          temperature,
          maxOutputTokens,
          timeoutMs
        };

        const response =
          selected.provider === "openai" ? await callOpenAI(callArgs) : await callAnthropic(callArgs);
        const output = parseJsonStrict(response.rawText);
        const result: GatewayResult = {
          provider: selected.provider,
          model: selected.model,
          output,
          rawText: response.rawText,
          usage: response.usage,
          attempts: attempt,
          costEstimateUsd: estimateCostUsd(selected.provider, response.usage)
        };

        await ctx.runMutation(api.audit.appendAudit, {
          runId: args.runId,
          entityType: "llm",
          entityId: `${selected.provider}:${selected.model}`,
          action: "LLM_CALL_SUCCESS",
          actor,
          details: {
            provider: selected.provider,
            model: selected.model,
            attempts: attempt,
            usage: response.usage,
            costEstimateUsd: result.costEstimateUsd,
            metadata: args.metadata ?? {}
          }
        });

        return result;
      } catch (error) {
        lastError = error;
      }
    }

    await ctx.runMutation(api.audit.appendAudit, {
      runId: args.runId,
      entityType: "llm",
      entityId: `${selected.provider}:${selected.model}`,
      action: "LLM_CALL_FAILED",
      actor,
      details: {
        provider: selected.provider,
        model: selected.model,
        retries,
        error: lastError instanceof Error ? lastError.message : String(lastError),
        metadata: args.metadata ?? {}
      }
    });

    throw new Error(lastError instanceof Error ? lastError.message : "LLM call failed");
  }
});
