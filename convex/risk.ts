import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const addRiskFlag = mutation({
  args: {
    runId: v.id("ventureRuns"),
    scope: v.union(
      v.literal("idea"),
      v.literal("social"),
      v.literal("platform"),
      v.literal("legal"),
      v.literal("privacy"),
      v.literal("claims")
    ),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("hard_stop")),
    title: v.string(),
    description: v.string(),
    mitigation: v.optional(v.string()),
    actor: v.string()
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("ventureRiskFlags", {
      runId: args.runId,
      scope: args.scope,
      severity: args.severity,
      title: args.title,
      description: args.description,
      mitigation: args.mitigation,
      status: "open",
      createdAt: now,
      updatedAt: now
    });

    await ctx.runMutation(api.audit.appendAudit, {
      runId: args.runId,
      entityType: "risk",
      entityId: id,
      action: "RISK_ADDED",
      actor: args.actor,
      details: { severity: args.severity, scope: args.scope }
    });

    return id;
  }
});

export const updateRiskStatus = mutation({
  args: {
    riskId: v.id("ventureRiskFlags"),
    status: v.union(v.literal("open"), v.literal("mitigated"), v.literal("accepted"), v.literal("waived")),
    actor: v.string()
  },
  handler: async (ctx, args) => {
    const risk = await ctx.db.get(args.riskId);
    if (!risk) throw new Error("Risk not found");

    await ctx.db.patch(risk._id, {
      status: args.status,
      updatedAt: Date.now()
    });

    await ctx.runMutation(api.audit.appendAudit, {
      runId: risk.runId,
      entityType: "risk",
      entityId: risk._id,
      action: `RISK_${args.status.toUpperCase()}`,
      actor: args.actor,
      details: {}
    });

    return risk._id;
  }
});

export const listRunRisks = query({
  args: {
    runId: v.id("ventureRuns")
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ventureRiskFlags")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .order("desc")
      .take(200);
  }
});
