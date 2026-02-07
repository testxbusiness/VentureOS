import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const startRun = mutation({
  args: {
    agent: v.string(),
    input: v.optional(v.any())
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("agentRuns", {
      agent: args.agent,
      status: "running",
      input: args.input,
      startedAt: Date.now()
    });
  }
});

export const finishRun = mutation({
  args: {
    runId: v.id("agentRuns"),
    status: v.union(v.literal("success"), v.literal("failed")),
    output: v.optional(v.any())
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.runId, {
      status: args.status,
      output: args.output,
      finishedAt: Date.now()
    });
    return args.runId;
  }
});

export const listRuns = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("agentRuns").order("desc").take(100);
  }
});
