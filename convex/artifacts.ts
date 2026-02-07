import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createArtifact = mutation({
  args: {
    projectSlug: v.string(),
    artifactType: v.union(v.literal("script"), v.literal("caption"), v.literal("brief"), v.literal("render_spec"), v.literal("report")),
    sourceProposalId: v.optional(v.id("proposals")),
    content: v.any()
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("artifacts", {
      ...args,
      createdAt: Date.now()
    });
  }
});

export const listArtifactsByProject = query({
  args: {
    projectSlug: v.string()
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("artifacts")
      .withIndex("by_project", (q) => q.eq("projectSlug", args.projectSlug))
      .order("desc")
      .take(100);
  }
});
