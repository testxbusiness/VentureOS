import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const createProductIdea = mutation({
  args: {
    title: v.string(),
    ideaType: v.union(v.literal("digital"), v.literal("pod"), v.literal("bundle")),
    targetEmotion: v.string(),
    actor: v.string()
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("productIdeas", {
      title: args.title,
      ideaType: args.ideaType,
      targetEmotion: args.targetEmotion,
      status: "new",
      createdAt: now,
      updatedAt: now
    });

    await ctx.runMutation(api.audit.appendAudit, {
      entityType: "product_idea",
      entityId: id,
      action: "CREATED",
      actor: args.actor,
      details: {
        ideaType: args.ideaType,
        targetEmotion: args.targetEmotion
      }
    });

    return id;
  }
});

export const createListingQueueItem = mutation({
  args: {
    ideaId: v.id("productIdeas"),
    channel: v.string(),
    listingPayload: v.any(),
    scheduledAt: v.number(),
    actor: v.string()
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("listingQueue", {
      ideaId: args.ideaId,
      channel: args.channel,
      status: "queued",
      listingPayload: args.listingPayload,
      scheduledAt: args.scheduledAt,
      publishedAt: undefined
    });

    await ctx.runMutation(api.audit.appendAudit, {
      entityType: "listing_queue",
      entityId: id,
      action: "QUEUED",
      actor: args.actor,
      details: { channel: args.channel }
    });

    return id;
  }
});

export const approveListingQueueItem = mutation({
  args: {
    queueId: v.id("listingQueue"),
    actor: v.string()
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.queueId);
    if (!item) throw new Error("Listing queue item not found");
    if (item.status !== "queued") throw new Error("Only queued listing items can be approved");

    await ctx.db.patch(item._id, { status: "approved" });

    await ctx.runMutation(api.audit.appendAudit, {
      entityType: "listing_queue",
      entityId: item._id,
      action: "APPROVED",
      actor: args.actor,
      details: {}
    });

    return item._id;
  }
});

export const markListingPublished = mutation({
  args: {
    queueId: v.id("listingQueue"),
    actor: v.string()
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.queueId);
    if (!item) throw new Error("Listing queue item not found");
    if (item.status !== "approved") throw new Error("Listing must be approved before publishing");

    const now = Date.now();
    await ctx.db.patch(item._id, {
      status: "published",
      publishedAt: now
    });

    await ctx.runMutation(api.audit.appendAudit, {
      entityType: "listing_queue",
      entityId: item._id,
      action: "PUBLISHED_MANUALLY",
      actor: args.actor,
      details: { publishedAt: now }
    });

    return item._id;
  }
});

export const listProductIdeas = query({
  args: {
    status: v.optional(v.union(v.literal("new"), v.literal("validated"), v.literal("rejected")))
  },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("productIdeas")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(100);
    }

    return await ctx.db.query("productIdeas").order("desc").take(100);
  }
});
