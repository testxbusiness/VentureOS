import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const appendAudit = mutation({
  args: {
    entityType: v.string(),
    entityId: v.string(),
    action: v.string(),
    actor: v.string(),
    details: v.any()
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("auditLog", {
      ...args,
      createdAt: Date.now()
    });
  }
});

export const listAuditByEntity = query({
  args: {
    entityType: v.string(),
    entityId: v.string()
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("auditLog")
      .withIndex("by_entity", (q) => q.eq("entityType", args.entityType).eq("entityId", args.entityId))
      .order("desc")
      .take(100);
  }
});
