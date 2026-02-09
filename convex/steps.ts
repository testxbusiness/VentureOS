import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const upsertStepOutput = mutation({
  args: {
    runId: v.id("ventureRuns"),
    stepKey: v.string(),
    status: v.union(
      v.literal("running"),
      v.literal("completed"),
      v.literal("needs_approval"),
      v.literal("blocked"),
      v.literal("failed"),
      v.literal("skipped")
    ),
    output: v.any(),
    evidenceRefs: v.optional(v.array(v.string())),
    actor: v.string()
  },
  handler: async (ctx, args) => {
    const step = await ctx.db
      .query("ventureRunSteps")
      .withIndex("by_run_step", (q) => q.eq("runId", args.runId).eq("stepKey", args.stepKey))
      .first();
    if (!step) throw new Error("Step not found");

    const now = Date.now();
    await ctx.db.patch(step._id, {
      status: args.status,
      output: args.output,
      evidenceRefs: args.evidenceRefs ?? step.evidenceRefs,
      finishedAt: args.status === "completed" ? now : step.finishedAt,
      updatedAt: now
    });

    await ctx.db.patch(args.runId, {
      status: args.status === "needs_approval" ? "awaiting_approval" : "running",
      currentStep: args.stepKey,
      updatedAt: now
    });

    await ctx.runMutation(api.audit.appendAudit, {
      runId: args.runId,
      entityType: "run_step",
      entityId: step._id,
      action: `STEP_${args.status.toUpperCase()}`,
      actor: args.actor,
      details: { stepKey: args.stepKey }
    });

    return step._id;
  }
});

export const completeRun = mutation({
  args: {
    runId: v.id("ventureRuns"),
    actor: v.string(),
    status: v.union(v.literal("completed"), v.literal("failed"), v.literal("blocked"))
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.runId, {
      status: args.status,
      completedAt: now,
      updatedAt: now
    });

    await ctx.runMutation(api.audit.appendAudit, {
      runId: args.runId,
      entityType: "run",
      entityId: args.runId,
      action: `RUN_${args.status.toUpperCase()}`,
      actor: args.actor,
      details: {}
    });

    return args.runId;
  }
});
