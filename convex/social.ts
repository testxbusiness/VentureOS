import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const upsertSocialPack = mutation({
  args: {
    runId: v.id("ventureRuns"),
    selectedIdeaKey: v.string(),
    platforms: v.array(v.string()),
    calendar30d: v.any(),
    scripts: v.any(),
    hooks: v.any(),
    ctas: v.any(),
    qaStatus: v.optional(v.union(v.literal("pending"), v.literal("pass"), v.literal("fail"))),
    qaNotes: v.optional(v.string()),
    actor: v.string()
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("ventureSocialPacks")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        selectedIdeaKey: args.selectedIdeaKey,
        platforms: args.platforms,
        calendar30d: args.calendar30d,
        scripts: args.scripts,
        hooks: args.hooks,
        ctas: args.ctas,
        qaStatus: args.qaStatus ?? existing.qaStatus,
        qaNotes: args.qaNotes,
        updatedAt: now
      });

      await ctx.runMutation(api.audit.appendAudit, {
        runId: args.runId,
        entityType: "social_pack",
        entityId: existing._id,
        action: "SOCIAL_PACK_UPDATED",
        actor: args.actor,
        details: { selectedIdeaKey: args.selectedIdeaKey }
      });

      return existing._id;
    }

    const id = await ctx.db.insert("ventureSocialPacks", {
      runId: args.runId,
      selectedIdeaKey: args.selectedIdeaKey,
      platforms: args.platforms,
      calendar30d: args.calendar30d,
      scripts: args.scripts,
      hooks: args.hooks,
      ctas: args.ctas,
      qaStatus: args.qaStatus ?? "pending",
      qaNotes: args.qaNotes,
      createdAt: now,
      updatedAt: now
    });

    await ctx.runMutation(api.audit.appendAudit, {
      runId: args.runId,
      entityType: "social_pack",
      entityId: id,
      action: "SOCIAL_PACK_CREATED",
      actor: args.actor,
      details: { selectedIdeaKey: args.selectedIdeaKey }
    });

    return id;
  }
});

export const getSocialPackByRun = query({
  args: {
    runId: v.id("ventureRuns")
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ventureSocialPacks")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .first();
  }
});
