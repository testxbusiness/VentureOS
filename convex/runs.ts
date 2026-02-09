import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

const DEFAULT_STEPS = [
  "A1_NICHE_INTAKE",
  "A2_MARKET_SIGNALS",
  "A3_VOC",
  "A4_TRIGGER_MAP",
  "A5_IDEA_GEN",
  "A6_SCORING",
  "A7_PNL_KPI",
  "A8_RISK_COMPLIANCE",
  "S1_PLATFORM_FIT",
  "S2_CONTENT_STRATEGY",
  "S3_30D_CALENDAR",
  "S4_SCRIPT_COPY",
  "S5_CREATIVE_PROMPTS",
  "S6_SOCIAL_QA",
  "A9_EXECUTION_PLANNER"
] as const;

export const createRun = mutation({
  args: {
    niche: v.string(),
    geo: v.string(),
    language: v.string(),
    constraints: v.array(v.string()),
    capabilities: v.union(v.literal("dev"), v.literal("no_code"), v.literal("hybrid")),
    createdBy: v.string(),
    seed: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const runId = await ctx.db.insert("ventureRuns", {
      niche: args.niche,
      geo: args.geo,
      language: args.language,
      constraints: args.constraints,
      capabilities: args.capabilities,
      status: "draft",
      currentStep: DEFAULT_STEPS[0],
      lockedAssumptions: undefined,
      seed: args.seed,
      version: 1,
      startedAt: now,
      completedAt: undefined,
      createdBy: args.createdBy,
      updatedAt: now
    });

    for (const [index, stepKey] of DEFAULT_STEPS.entries()) {
      await ctx.db.insert("ventureRunSteps", {
        runId,
        stepKey,
        status: index === 0 ? "running" : "pending",
        input: undefined,
        output: undefined,
        evidenceRefs: [],
        retryCount: 0,
        startedAt: index === 0 ? now : undefined,
        finishedAt: undefined,
        updatedAt: now
      });
    }

    await ctx.runMutation(api.audit.appendAudit, {
      runId,
      entityType: "run",
      entityId: runId,
      action: "RUN_CREATED",
      actor: args.createdBy,
      details: {
        niche: args.niche,
        geo: args.geo,
        language: args.language
      }
    });

    return runId;
  }
});

export const listRuns = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("running"),
        v.literal("awaiting_approval"),
        v.literal("approved"),
        v.literal("blocked"),
        v.literal("completed"),
        v.literal("failed")
      )
    )
  },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("ventureRuns")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(100);
    }
    return await ctx.db.query("ventureRuns").withIndex("by_updated", (q) => q.gte("updatedAt", 0)).order("desc").take(100);
  }
});

export const getRun = query({
  args: {
    runId: v.id("ventureRuns")
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.runId);
  }
});

export const getRunDetail = query({
  args: {
    runId: v.id("ventureRuns")
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) return null;

    const [steps, approvals, artifacts, scores, risks, socialPack, vocSnippets] = await Promise.all([
      ctx.db.query("ventureRunSteps").withIndex("by_run", (q) => q.eq("runId", args.runId)).collect(),
      ctx.db.query("ventureApprovals").withIndex("by_run", (q) => q.eq("runId", args.runId)).collect(),
      ctx.db.query("ventureArtifacts").withIndex("by_run", (q) => q.eq("runId", args.runId)).collect(),
      ctx.db.query("ventureScores").withIndex("by_run", (q) => q.eq("runId", args.runId)).collect(),
      ctx.db.query("ventureRiskFlags").withIndex("by_run", (q) => q.eq("runId", args.runId)).collect(),
      ctx.db.query("ventureSocialPacks").withIndex("by_run", (q) => q.eq("runId", args.runId)).first(),
      ctx.db.query("ventureVocSnippets").withIndex("by_run", (q) => q.eq("runId", args.runId)).collect()
    ]);

    return { run, steps, approvals, artifacts, scores, risks, socialPack, vocSnippets };
  }
});

export const lockAssumptions = mutation({
  args: {
    runId: v.id("ventureRuns"),
    assumptions: v.any(),
    actor: v.string()
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.runId, {
      lockedAssumptions: args.assumptions,
      updatedAt: Date.now()
    });

    await ctx.runMutation(api.audit.appendAudit, {
      runId: args.runId,
      entityType: "run",
      entityId: args.runId,
      action: "ASSUMPTIONS_LOCKED",
      actor: args.actor,
      details: args.assumptions
    });

    return args.runId;
  }
});

export const rerunStep = mutation({
  args: {
    runId: v.id("ventureRuns"),
    stepKey: v.string(),
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
      status: "running",
      retryCount: step.retryCount + 1,
      startedAt: now,
      finishedAt: undefined,
      updatedAt: now
    });

    await ctx.db.patch(args.runId, {
      status: "running",
      currentStep: args.stepKey,
      updatedAt: now
    });

    await ctx.runMutation(api.audit.appendAudit, {
      runId: args.runId,
      entityType: "run_step",
      entityId: step._id,
      action: "STEP_RERUN",
      actor: args.actor,
      details: { stepKey: args.stepKey }
    });

    return step._id;
  }
});
