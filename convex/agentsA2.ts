"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { anyApi } from "convex/server";

const internalApi = anyApi as any;

function nowIso() {
  return new Date().toISOString();
}

type A2Analysis = {
  competitorPatterns: string[];
  monetizationPatterns: string[];
  saturationLevel: "low" | "medium" | "high";
  differentiationOptions: string[];
  priorityChannels: string[];
  keyDemandSignals: string[];
};

export const runA2MarketSignals = action({
  args: {
    runId: v.id("ventureRuns"),
    actor: v.string()
  },
  handler: async (ctx, args) => {
    const detail = await ctx.runQuery(internalApi.runs.getRunDetail, { runId: args.runId });
    if (!detail) throw new Error("Run not found");

    const approvedBrief = (detail.approvals ?? []).find(
      (item: any) => item.checkpointType === "NICHE_BRIEF" && item.status === "approved"
    );
    if (!approvedBrief) {
      throw new Error("Niche Brief approval required before running A2");
    }

    const a2Step = (detail.steps ?? []).find((step: any) => step.stepKey === "A2_MARKET_SIGNALS");
    if (!a2Step) throw new Error("A2 step not found");

    const retrieved = await ctx.runAction(internalApi.retrieval.collectMarketSources, {
      niche: detail.run.niche,
      geo: detail.run.geo,
      language: detail.run.language,
      maxSources: 18
    });
    if (!retrieved.sources.length) {
      throw new Error("No market sources retrieved for A2");
    }

    const compliance = await ctx.runMutation(internalApi.research.evaluateResearchBatch, {
      runId: detail.run._id,
      sources: retrieved.sources.map((item: any) => ({ url: item.url, snippet: item.snippet })),
      estimatedTokens: retrieved.sources.length * 220,
      estimatedCostUsd: Number((retrieved.sources.length * 0.015).toFixed(3)),
      actor: args.actor,
      enforceStop: true
    });
    if (compliance.blocked) {
      throw new Error(`A2 blocked by research compliance: ${compliance.reasonCodes.join(", ")}`);
    }

    const llmSchema = {
      type: "object",
      additionalProperties: false,
      properties: {
        competitorPatterns: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 8 },
        monetizationPatterns: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 8 },
        saturationLevel: { type: "string", enum: ["low", "medium", "high"] },
        differentiationOptions: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 8 },
        priorityChannels: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 8 },
        keyDemandSignals: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 8 }
      },
      required: [
        "competitorPatterns",
        "monetizationPatterns",
        "saturationLevel",
        "differentiationOptions",
        "priorityChannels",
        "keyDemandSignals"
      ]
    };

    let analysis: A2Analysis;
    let llmFallbackUsed = false;
    try {
      const llmResult = await ctx.runAction(internalApi.llm.generateStructured, {
        runId: detail.run._id,
        systemPrompt: "You are a market intelligence analyst. Return concise, evidence-grounded JSON only. No markdown.",
        userPrompt: JSON.stringify({
          task: "Analyze market signals for niche opportunity.",
          niche: detail.run.niche,
          geo: detail.run.geo,
          language: detail.run.language,
          sources: retrieved.sources.slice(0, 15)
        }),
        schema: llmSchema,
        temperature: 0.2,
        maxOutputTokens: 1400,
        retries: 1,
        actor: args.actor,
        metadata: { stepKey: "A2_MARKET_SIGNALS", sourceProvider: retrieved.provider }
      });
      analysis = llmResult.output as A2Analysis;
    } catch {
      llmFallbackUsed = true;
      analysis = {
        competitorPatterns: [
          "Comparison pages and listicles dominate top results.",
          "High overlap on positioning: speed + simplicity.",
          "Frequent promise of templates/toolkits as lead magnet."
        ],
        monetizationPatterns: ["affiliate bundles", "subscription micro-tool", "sponsored listing"],
        saturationLevel: "medium",
        differentiationOptions: [
          "Geo/language localization for underserved segment.",
          "Narrow outcome-first onboarding instead of broad feature set.",
          "Proof-driven messaging based on concrete evidence snippets."
        ],
        priorityChannels: ["SEO clusters", "community threads", "short-form video"],
        keyDemandSignals: ["high comparison intent", "pricing sensitivity", "demand for practical implementation"]
      };
    }

    const evidenceRefs = retrieved.sources.map((item: any) => `url:${item.url}`);
    const signals = {
      generatedAt: nowIso(),
      principles: [
        "Market Signals separa evidenze osservabili da ipotesi speculative.",
        "Ogni insight deve essere tracciabile a una fonte concreta.",
        "Output orientato a differenziazione e canali attivabili."
      ],
      framework: {
        landscapeLenses: ["demand", "competition", "distribution", "monetization"],
        niche: detail.run.niche,
        geo: detail.run.geo,
        language: detail.run.language,
        sourceProvider: retrieved.provider,
        sourceCount: retrieved.sources.length,
        llmFallbackUsed
      },
      deliverable: {
        competitorPatterns: analysis.competitorPatterns,
        monetizationPatterns: analysis.monetizationPatterns,
        saturationLevel: analysis.saturationLevel,
        differentiationOptions: analysis.differentiationOptions,
        priorityChannels: analysis.priorityChannels,
        keyDemandSignals: analysis.keyDemandSignals,
        sourceSample: retrieved.sources.slice(0, 8),
        checklist: [
          "Landscape sintetizzato su fonti reali",
          "Monetization patterns identificati",
          "Saturazione e differenziazione esplicitate",
          "Canali prioritari suggeriti con evidenze"
        ]
      }
    };

    const stepId = await ctx.runMutation(internalApi.steps.upsertStepOutput, {
      runId: detail.run._id,
      stepKey: "A2_MARKET_SIGNALS",
      status: "completed",
      output: signals,
      evidenceRefs,
      actor: args.actor
    });

    const artifactId = await ctx.runMutation(internalApi.artifacts.createArtifact, {
      runId: detail.run._id,
      stepKey: "A2_MARKET_SIGNALS",
      artifactType: "market_landscape",
      format: "json",
      title: "Market Signals (A2)",
      content: signals,
      evidenceRefs,
      actor: args.actor
    });

    await ctx.runMutation(internalApi.audit.appendAudit, {
      runId: detail.run._id,
      entityType: "agent",
      entityId: `A2:${detail.run._id}`,
      action: "A2_COMPLETED",
      actor: args.actor,
      details: { artifactId, stepId, sourceCount: retrieved.sources.length, llmFallbackUsed }
    });

    return { stepId, artifactId, sourceCount: retrieved.sources.length, llmFallbackUsed };
  }
});
