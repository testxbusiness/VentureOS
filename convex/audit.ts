import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const appendAudit = mutation({
  args: {
    runId: v.optional(v.id("ventureRuns")),
    entityType: v.string(),
    entityId: v.string(),
    action: v.string(),
    actor: v.string(),
    details: v.any()
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("ventureAuditLog", {
      ...args,
      createdAt: Date.now()
    });
  }
});

export const listRunAudit = query({
  args: {
    runId: v.id("ventureRuns")
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ventureAuditLog")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .order("desc")
      .take(200);
  }
});
