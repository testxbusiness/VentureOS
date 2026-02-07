import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function checkNoMedical(text: string, blockedTerms: string[]) {
  const lower = text.toLowerCase();
  return blockedTerms.filter((term) => lower.includes(term.toLowerCase()));
}

async function appendAudit(
  ctx: any,
  payload: {
    entityType: string;
    entityId: string;
    action: string;
    actor: string;
    details: Record<string, unknown>;
  }
) {
  await ctx.db.insert("auditLog", {
    ...payload,
    createdAt: Date.now()
  });
}

export const createProposal = mutation({
  args: {
    projectSlug: v.string(),
    proposalType: v.union(
      v.literal("feature"),
      v.literal("content_batch"),
      v.literal("experiment"),
      v.literal("purchase_request"),
      v.literal("social_publish"),
      v.literal("product_expansion"),
      v.literal("finance_adjustment")
    ),
    title: v.string(),
    summary: v.string(),
    payload: v.any(),
    riskLevel: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    createdBy: v.string(),
    requiresApproval: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const guardrails = await ctx.db
      .query("guardrails")
      .withIndex("by_scope", (q) => q.eq("scope", "company"))
      .first();

    const blockedTerms = guardrails?.blockedTerms ?? [];
    const textForScan = `${args.title}\n${args.summary}\n${JSON.stringify(args.payload)}`;
    const blockedMatches = checkNoMedical(textForScan, blockedTerms);

    if (blockedMatches.length > 0) {
      throw new Error(`Compliance violation (no-medical). Terms: ${blockedMatches.join(", ")}`);
    }

    const proposalId = await ctx.db.insert("proposals", {
      projectSlug: args.projectSlug,
      proposalType: args.proposalType,
      title: args.title,
      summary: args.summary,
      payload: args.payload,
      riskLevel: args.riskLevel,
      requiresApproval: args.requiresApproval ?? true,
      status: "PROPOSED",
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now
    });

    await appendAudit(ctx, {
      entityType: "proposal",
      entityId: proposalId,
      action: "PROPOSED",
      actor: args.createdBy,
      details: {
        proposalType: args.proposalType,
        riskLevel: args.riskLevel
      }
    });

    return proposalId;
  }
});

export const listProposals = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("PROPOSED"),
        v.literal("APPROVED"),
        v.literal("DENIED"),
        v.literal("EXECUTED"),
        v.literal("FAILED")
      )
    )
  },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("proposals")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(100);
    }

    return await ctx.db.query("proposals").order("desc").take(100);
  }
});

export const approveProposal = mutation({
  args: {
    proposalId: v.id("proposals"),
    reviewerId: v.string(),
    decision: v.union(v.literal("APPROVED"), v.literal("DENIED")),
    reason: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal) throw new Error("Proposal not found");
    if (proposal.status !== "PROPOSED") throw new Error("Only PROPOSED proposals can be reviewed");

    const now = Date.now();
    await ctx.db.insert("approvals", {
      proposalId: proposal._id,
      reviewerId: args.reviewerId,
      decision: args.decision,
      reason: args.reason,
      createdAt: now
    });

    await ctx.db.patch(proposal._id, {
      status: args.decision,
      updatedAt: now
    });

    if (proposal.proposalType === "purchase_request") {
      const request = await ctx.db
        .query("purchaseRequests")
        .withIndex("by_status", (q) => q.eq("status", "PENDING_APPROVAL"))
        .filter((q) => q.eq(q.field("proposalId"), proposal._id))
        .first();

      if (request) {
        await ctx.db.patch(request._id, {
          status: args.decision === "APPROVED" ? "APPROVED_PENDING_PAYMENT" : "REJECTED",
          updatedAt: now
        });
      }
    }

    await appendAudit(ctx, {
      entityType: "proposal",
      entityId: proposal._id,
      action: args.decision,
      actor: args.reviewerId,
      details: { reason: args.reason ?? "" }
    });

    return proposal._id;
  }
});

export const executeApprovedProposal = mutation({
  args: {
    proposalId: v.id("proposals"),
    actor: v.string()
  },
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal) throw new Error("Proposal not found");
    if (proposal.status !== "APPROVED") throw new Error("Only APPROVED proposals can be executed");

    if (proposal.proposalType === "purchase_request") {
      const purchase = await ctx.db
        .query("purchaseRequests")
        .filter((q) => q.eq(q.field("proposalId"), proposal._id))
        .first();
      if (!purchase || purchase.status !== "PAID") {
        throw new Error("Purchase request requires manual payment confirmation before execution");
      }
    }

    const now = Date.now();
    await ctx.db.patch(proposal._id, {
      status: "EXECUTED",
      updatedAt: now
    });

    await appendAudit(ctx, {
      entityType: "proposal",
      entityId: proposal._id,
      action: "EXECUTED",
      actor: args.actor,
      details: {
        proposalType: proposal.proposalType
      }
    });

    return proposal._id;
  }
});

export const failProposal = mutation({
  args: {
    proposalId: v.id("proposals"),
    actor: v.string(),
    reason: v.string()
  },
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal) throw new Error("Proposal not found");

    await ctx.db.patch(proposal._id, {
      status: "FAILED",
      updatedAt: Date.now()
    });

    await appendAudit(ctx, {
      entityType: "proposal",
      entityId: proposal._id,
      action: "FAILED",
      actor: args.actor,
      details: { reason: args.reason }
    });

    return proposal._id;
  }
});
