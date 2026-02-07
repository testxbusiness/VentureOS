import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const enqueuePost = mutation({
  args: {
    projectSlug: v.string(),
    proposalId: v.id("proposals"),
    platform: v.union(v.literal("youtube"), v.literal("instagram"), v.literal("tiktok")),
    postCopy: v.string(),
    assetArtifactId: v.optional(v.id("artifacts")),
    scheduledAt: v.number(),
    actor: v.string()
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("socialQueue", {
      projectSlug: args.projectSlug,
      proposalId: args.proposalId,
      platform: args.platform,
      postCopy: args.postCopy,
      assetArtifactId: args.assetArtifactId,
      status: "queued",
      scheduledAt: args.scheduledAt
    });

    await ctx.runMutation(api.audit.appendAudit, {
      entityType: "social_queue",
      entityId: id,
      action: "QUEUED",
      actor: args.actor,
      details: {
        platform: args.platform,
        scheduledAt: args.scheduledAt
      }
    });

    return id;
  }
});

export const approvePost = mutation({
  args: {
    queueId: v.id("socialQueue"),
    actor: v.string()
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.queueId);
    if (!item) throw new Error("Queue item not found");
    if (item.status !== "queued") throw new Error("Only queued items can be approved");

    await ctx.db.patch(item._id, { status: "approved" });

    await ctx.runMutation(api.audit.appendAudit, {
      entityType: "social_queue",
      entityId: item._id,
      action: "APPROVED",
      actor: args.actor,
      details: {}
    });

    return item._id;
  }
});

export const markPublished = mutation({
  args: {
    queueId: v.id("socialQueue"),
    actor: v.string()
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.queueId);
    if (!item) throw new Error("Queue item not found");
    if (item.status !== "approved") throw new Error("Approve required before publish");

    const now = Date.now();
    await ctx.db.patch(item._id, {
      status: "published",
      publishedAt: now
    });

    await ctx.runMutation(api.audit.appendAudit, {
      entityType: "social_queue",
      entityId: item._id,
      action: "PUBLISHED_MANUALLY",
      actor: args.actor,
      details: { publishedAt: now }
    });

    return item._id;
  }
});

export const listQueue = query({
  args: {
    status: v.optional(v.union(v.literal("queued"), v.literal("approved"), v.literal("published"), v.literal("failed")))
  },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("socialQueue")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(100);
    }

    return await ctx.db.query("socialQueue").order("desc").take(100);
  }
});
