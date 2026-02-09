import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const addIdeaScore = mutation({
  args: {
    runId: v.id("ventureRuns"),
    ideaKey: v.string(),
    rubricVersion: v.string(),
    dimensions: v.any(),
    weights: v.any(),
    overallScore: v.number(),
    unknowns: v.array(v.string()),
    actor: v.string()
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("ventureScores", {
      runId: args.runId,
      ideaKey: args.ideaKey,
      rubricVersion: args.rubricVersion,
      dimensions: args.dimensions,
      weights: args.weights,
      overallScore: args.overallScore,
      unknowns: args.unknowns,
      createdAt: Date.now()
    });

    await ctx.runMutation(api.audit.appendAudit, {
      runId: args.runId,
      entityType: "score",
      entityId: id,
      action: "SCORE_ADDED",
      actor: args.actor,
      details: { ideaKey: args.ideaKey, overallScore: args.overallScore }
    });

    return id;
  }
});

export const listTopScores = query({
  args: {
    runId: v.id("ventureRuns"),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const items = await ctx.db.query("ventureScores").withIndex("by_run", (q) => q.eq("runId", args.runId)).collect();
    return items.sort((a, b) => b.overallScore - a.overallScore).slice(0, args.limit ?? 5);
  }
});
