import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

function normalizeDomain(input: string): string {
  return input.trim().toLowerCase().replace(/^www\./, "");
}

function getDomain(url: string): string | null {
  try {
    return normalizeDomain(new URL(url).hostname);
  } catch {
    return null;
  }
}

function redactPII(text: string): string {
  const emailRedacted = text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]");
  return emailRedacted.replace(/(\+?\d[\d\s().-]{7,}\d)/g, "[REDACTED_PHONE]");
}

const SENSITIVE_CLAIM_PATTERNS = [
  /\bdiagnosi\b/i,
  /\bterapia\b/i,
  /\bcura\b/i,
  /\bfarmaco\b/i,
  /\bmedical advice\b/i,
  /\bguaranteed results?\b/i,
  /\brisultat[oi] garantit[oi]\b/i
];

const REGULATED_NICHE_TERMS = [
  "health",
  "medical",
  "medico",
  "salute",
  "finance",
  "finanza",
  "investment",
  "investimenti",
  "legal",
  "legale",
  "insurance",
  "assicurazioni"
];

type GuardrailPolicy = {
  allowedDomains: string[];
  blockedDomains: string[];
  maxSourcesPerBatch: number;
  maxTokenBudgetPerBatch: number;
  maxCostUsdPerBatch: number;
  redactPII: boolean;
};

function mergePolicy(globalPolicy: GuardrailPolicy, runPolicy?: Partial<GuardrailPolicy>): GuardrailPolicy {
  return {
    allowedDomains: runPolicy?.allowedDomains ?? globalPolicy.allowedDomains,
    blockedDomains: runPolicy?.blockedDomains ?? globalPolicy.blockedDomains,
    maxSourcesPerBatch: runPolicy?.maxSourcesPerBatch ?? globalPolicy.maxSourcesPerBatch,
    maxTokenBudgetPerBatch: runPolicy?.maxTokenBudgetPerBatch ?? globalPolicy.maxTokenBudgetPerBatch,
    maxCostUsdPerBatch: runPolicy?.maxCostUsdPerBatch ?? globalPolicy.maxCostUsdPerBatch,
    redactPII: runPolicy?.redactPII ?? globalPolicy.redactPII
  };
}

function defaultPolicy(): GuardrailPolicy {
  return {
    allowedDomains: ["reddit.com", "youtube.com", "trustpilot.com", "g2.com", "capterra.com", "producthunt.com"],
    blockedDomains: ["facebook.com", "instagram.com", "linkedin.com"],
    maxSourcesPerBatch: 30,
    maxTokenBudgetPerBatch: 120000,
    maxCostUsdPerBatch: 7.5,
    redactPII: true
  };
}

async function resolveEffectivePolicy(ctx: { db: any }, runId?: string): Promise<GuardrailPolicy> {
  const global = await ctx.db
    .query("ventureGuardrails")
    .withIndex("by_scope", (q: any) => q.eq("scope", "global"))
    .first();

  const run =
    runId &&
    (await ctx.db
      .query("ventureGuardrails")
      .withIndex("by_scope", (q: any) => q.eq("scope", "run"))
      .filter((q: any) => q.eq(q.field("runId"), runId))
      .first());

  const defaults = defaultPolicy();
  const base = {
    ...defaults,
    ...(global
      ? {
          allowedDomains: global.allowedDomains ?? defaults.allowedDomains,
          blockedDomains: global.blockedDomains ?? defaults.blockedDomains,
          maxSourcesPerBatch: global.maxSourcesPerBatch ?? defaults.maxSourcesPerBatch,
          maxTokenBudgetPerBatch: global.maxTokenBudgetPerBatch ?? defaults.maxTokenBudgetPerBatch,
          maxCostUsdPerBatch: global.maxCostUsdPerBatch ?? defaults.maxCostUsdPerBatch,
          redactPII: global.redactPII ?? defaults.redactPII
        }
      : {})
  };

  return mergePolicy(base, run ?? undefined);
}

export const upsertResearchGuardrails = mutation({
  args: {
    scope: v.union(v.literal("global"), v.literal("run")),
    runId: v.optional(v.id("ventureRuns")),
    allowedDomains: v.optional(v.array(v.string())),
    blockedDomains: v.optional(v.array(v.string())),
    maxSourcesPerBatch: v.optional(v.number()),
    maxTokenBudgetPerBatch: v.optional(v.number()),
    maxCostUsdPerBatch: v.optional(v.number()),
    redactPII: v.optional(v.boolean()),
    actor: v.string()
  },
  handler: async (ctx, args) => {
    const existing =
      args.scope === "global"
        ? await ctx.db
            .query("ventureGuardrails")
            .withIndex("by_scope", (q) => q.eq("scope", "global"))
            .first()
        : await ctx.db
            .query("ventureGuardrails")
            .withIndex("by_scope", (q) => q.eq("scope", "run"))
            .filter((q) => q.eq(q.field("runId"), args.runId))
            .first();

    const now = Date.now();
    const patch = {
      scope: args.scope,
      runId: args.scope === "run" ? args.runId : undefined,
      allowedDomains: args.allowedDomains?.map(normalizeDomain),
      blockedDomains: args.blockedDomains?.map(normalizeDomain),
      maxSourcesPerBatch: args.maxSourcesPerBatch,
      maxTokenBudgetPerBatch: args.maxTokenBudgetPerBatch,
      maxCostUsdPerBatch: args.maxCostUsdPerBatch,
      redactPII: args.redactPII,
      updatedBy: args.actor,
      updatedAt: now
    };

    let id;
    if (existing) {
      await ctx.db.patch(existing._id, patch);
      id = existing._id;
    } else {
      id = await ctx.db.insert("ventureGuardrails", {
        rules: [],
        hardStops: ["Source policy violation", "Sensitive claim detected", "Budget exceeded"],
        requiredHumanCheckpoints: ["PNL_RISK_GO_NO_GO"],
        ...patch
      });
    }

    await ctx.runMutation(api.audit.appendAudit, {
      runId: args.runId,
      entityType: "guardrail",
      entityId: String(id),
      action: "RESEARCH_GUARDRAILS_UPDATED",
      actor: args.actor,
      details: {
        scope: args.scope,
        hasAllowedDomains: Boolean(args.allowedDomains?.length),
        hasBlockedDomains: Boolean(args.blockedDomains?.length)
      }
    });

    return id;
  }
});

export const getEffectiveResearchGuardrails = query({
  args: {
    runId: v.optional(v.id("ventureRuns"))
  },
  handler: async (ctx, args): Promise<GuardrailPolicy> => {
    return await resolveEffectivePolicy(ctx, args.runId);
  }
});

export const evaluateResearchBatch = mutation({
  args: {
    runId: v.id("ventureRuns"),
    sources: v.array(
      v.object({
        url: v.string(),
        snippet: v.string()
      })
    ),
    estimatedTokens: v.number(),
    estimatedCostUsd: v.number(),
    actor: v.string(),
    enforceStop: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const policy = await resolveEffectivePolicy(ctx, args.runId);
    const run = await ctx.db.get(args.runId);
    if (!run) throw new Error("Run not found");
    const reasonCodes: string[] = [];
    const warningCodes: string[] = [];
    const blockedDomains: string[] = [];
    const nonAllowedDomains: string[] = [];
    const invalidUrls: string[] = [];

    const uniqueDomains = [...new Set(args.sources.map((s) => getDomain(s.url)).filter(Boolean) as string[])];
    const allowedSet = new Set(policy.allowedDomains.map(normalizeDomain));
    const blockedSet = new Set(policy.blockedDomains.map(normalizeDomain));

    for (const source of args.sources) {
      const domain = getDomain(source.url);
      if (!domain) {
        invalidUrls.push(source.url);
        continue;
      }
      if (blockedSet.has(domain)) {
        blockedDomains.push(domain);
      }
      if (allowedSet.size > 0 && !allowedSet.has(domain)) {
        nonAllowedDomains.push(domain);
      }
    }

    if (invalidUrls.length > 0) reasonCodes.push("INVALID_SOURCE_URL");
    if (blockedDomains.length > 0) reasonCodes.push("SOURCE_POLICY_BLOCK");
    if (nonAllowedDomains.length > 0) warningCodes.push("SOURCE_ALLOWLIST_MISS");
    if (args.sources.length > policy.maxSourcesPerBatch) reasonCodes.push("SOURCE_COUNT_LIMIT");
    if (args.estimatedTokens > policy.maxTokenBudgetPerBatch) reasonCodes.push("TOKEN_BUDGET_EXCEEDED");
    if (args.estimatedCostUsd > policy.maxCostUsdPerBatch) reasonCodes.push("COST_BUDGET_EXCEEDED");

    const nicheText = `${run.niche ?? ""}`.toLowerCase();
    const isRegulatedNiche = REGULATED_NICHE_TERMS.some((term) => nicheText.includes(term));
    const sensitiveHits = isRegulatedNiche
      ? args.sources.filter((source) => SENSITIVE_CLAIM_PATTERNS.some((pattern) => pattern.test(source.snippet)))
      : [];
    if (sensitiveHits.length > 0) reasonCodes.push("SENSITIVE_CLAIM_DETECTED");

    const shouldBlock = reasonCodes.length > 0;
    const enforceStop = args.enforceStop ?? true;

    if (shouldBlock && enforceStop) {
      await ctx.db.patch(args.runId, {
        status: "blocked",
        updatedAt: Date.now()
      });

      await ctx.db.insert("ventureRiskFlags", {
        runId: args.runId,
        scope: "claims",
        severity: "hard_stop",
        title: "Research compliance hard stop",
        description: `Research batch blocked: ${reasonCodes.join(", ")}`,
        mitigation: "Adjust sources/claims/budget and rerun compliance check.",
        status: "open",
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }

    const auditSources = args.sources.slice(0, 10).map((source) => ({
      url: source.url,
      snippet: policy.redactPII ? redactPII(source.snippet) : source.snippet
    }));

    await ctx.runMutation(api.audit.appendAudit, {
      runId: args.runId,
      entityType: "research_batch",
      entityId: `research:${args.runId}:${Date.now()}`,
      action: shouldBlock ? "RESEARCH_BATCH_BLOCKED" : "RESEARCH_BATCH_ALLOWED",
      actor: args.actor,
      details: {
        reasonCodes,
        sourceCount: args.sources.length,
        uniqueDomainCount: uniqueDomains.length,
        estimatedTokens: args.estimatedTokens,
        estimatedCostUsd: args.estimatedCostUsd,
        blockedDomains: [...new Set(blockedDomains)],
        nonAllowedDomains: [...new Set(nonAllowedDomains)],
        warningCodes,
        sampleSources: auditSources
      }
    });

    return {
      allowed: !shouldBlock,
      blocked: shouldBlock,
      reasonCodes,
      warningCodes,
      uniqueDomains,
      effectivePolicy: policy
    };
  }
});
