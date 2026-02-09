import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const requestApproval = mutation({
  args: {
    runId: v.id("ventureRuns"),
    checkpointType: v.union(
      v.literal("NICHE_BRIEF"),
      v.literal("TRIGGER_MAP"),
      v.literal("SHORTLIST"),
      v.literal("PNL_RISK_GO_NO_GO"),
      v.literal("SOCIAL_PACK_FINAL")
    ),
    stepKey: v.optional(v.string()),
    payload: v.optional(v.any()),
    requestedBy: v.string()
  },
  handler: async (ctx, args) => {
    let stepId;
    if (args.stepKey) {
      const step = await ctx.db
        .query("ventureRunSteps")
        .withIndex("by_run_step", (q) => q.eq("runId", args.runId).eq("stepKey", args.stepKey!))
        .first();
      if (!step) throw new Error("Step not found");
      stepId = step._id;
      await ctx.db.patch(step._id, {
        status: "needs_approval",
        updatedAt: Date.now()
      });
    }

    const now = Date.now();
    const approvalId = await ctx.db.insert("ventureApprovals", {
      runId: args.runId,
      stepId,
      checkpointType: args.checkpointType,
      status: "pending",
      payload: args.payload,
      requestedBy: args.requestedBy,
      reviewedBy: undefined,
      decisionNote: undefined,
      createdAt: now,
      updatedAt: now
    });

    await ctx.db.patch(args.runId, {
      status: "awaiting_approval",
      updatedAt: now
    });

    await ctx.runMutation(api.audit.appendAudit, {
      runId: args.runId,
      entityType: "approval",
      entityId: approvalId,
      action: "APPROVAL_REQUESTED",
      actor: args.requestedBy,
      details: { checkpointType: args.checkpointType, stepKey: args.stepKey }
    });

    return approvalId;
  }
});

export const decideApproval = mutation({
  args: {
    approvalId: v.id("ventureApprovals"),
    decision: v.union(v.literal("approved"), v.literal("rejected")),
    reviewer: v.string(),
    note: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const approval = await ctx.db.get(args.approvalId);
    if (!approval) throw new Error("Approval not found");
    if (approval.status !== "pending") throw new Error("Approval already decided");

    const now = Date.now();
    await ctx.db.patch(approval._id, {
      status: args.decision,
      reviewedBy: args.reviewer,
      decisionNote: args.note,
      updatedAt: now
    });

    if (approval.stepId) {
      await ctx.db.patch(approval.stepId, {
        status: args.decision === "approved" ? "completed" : "blocked",
        finishedAt: args.decision === "approved" ? now : undefined,
        updatedAt: now
      });
    }

    await ctx.db.patch(approval.runId, {
      status: args.decision === "approved" ? "running" : "blocked",
      updatedAt: now
    });

    await ctx.runMutation(api.audit.appendAudit, {
      runId: approval.runId,
      entityType: "approval",
      entityId: approval._id,
      action: args.decision === "approved" ? "APPROVED" : "REJECTED",
      actor: args.reviewer,
      details: { note: args.note ?? "" }
    });

    return approval._id;
  }
});

export const listApprovalQueue = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("ventureApprovals")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .take(200);
  }
});
