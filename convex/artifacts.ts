import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const createArtifact = mutation({
  args: {
    runId: v.id("ventureRuns"),
    stepKey: v.string(),
    artifactType: v.string(),
    format: v.union(v.literal("md"), v.literal("json"), v.literal("csv"), v.literal("table")),
    title: v.string(),
    content: v.any(),
    evidenceRefs: v.optional(v.array(v.string())),
    actor: v.string()
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("ventureArtifacts", {
      runId: args.runId,
      stepKey: args.stepKey,
      artifactType: args.artifactType,
      format: args.format,
      title: args.title,
      content: args.content,
      evidenceRefs: args.evidenceRefs ?? [],
      version: 1,
      createdAt: Date.now()
    });

    await ctx.runMutation(api.audit.appendAudit, {
      runId: args.runId,
      entityType: "artifact",
      entityId: id,
      action: "ARTIFACT_CREATED",
      actor: args.actor,
      details: { stepKey: args.stepKey, artifactType: args.artifactType }
    });

    return id;
  }
});

export const listArtifactsByRun = query({
  args: { runId: v.id("ventureRuns") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ventureArtifacts")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .order("desc")
      .take(300);
  }
});
