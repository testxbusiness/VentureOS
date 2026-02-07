import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const createPurchaseRequest = mutation({
  args: {
    proposalId: v.id("proposals"),
    vendor: v.string(),
    item: v.string(),
    amountEur: v.number(),
    paymentUrl: v.string(),
    expectedRoi: v.string(),
    category: v.optional(v.string()),
    projectSlug: v.optional(v.string()),
    createdBy: v.string()
  },
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal) throw new Error("Proposal not found");
    if (proposal.proposalType !== "purchase_request") {
      throw new Error("Linked proposal must be purchase_request");
    }

    const now = Date.now();
    const requestId = await ctx.db.insert("purchaseRequests", {
      proposalId: args.proposalId,
      vendor: args.vendor,
      item: args.item,
      amountEur: args.amountEur,
      paymentUrl: args.paymentUrl,
      expectedRoi: args.expectedRoi,
      category: args.category,
      projectSlug: args.projectSlug,
      status: "PENDING_APPROVAL",
      createdAt: now,
      updatedAt: now
    });

    await ctx.runMutation(api.audit.appendAudit, {
      entityType: "purchase_request",
      entityId: requestId,
      action: "CREATED",
      actor: args.createdBy,
      details: {
        amountEur: args.amountEur,
        vendor: args.vendor,
        item: args.item
      }
    });

    return requestId;
  }
});

export const markPurchasePaid = mutation({
  args: {
    requestId: v.id("purchaseRequests"),
    actor: v.string()
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Purchase request not found");
    if (request.status !== "APPROVED_PENDING_PAYMENT") {
      throw new Error("Only approved requests can be marked as paid");
    }

    const now = Date.now();
    await ctx.db.patch(request._id, {
      status: "PAID",
      paidAt: now,
      updatedAt: now
    });

    await ctx.runMutation(api.finance.createExpenseFromPurchase, {
      purchaseRequestId: request._id,
      actor: args.actor
    });

    await ctx.runMutation(api.audit.appendAudit, {
      entityType: "purchase_request",
      entityId: request._id,
      action: "PAID_CONFIRMED_MANUALLY",
      actor: args.actor,
      details: {}
    });

    return request._id;
  }
});

export const listPurchaseRequests = query({
  args: {
    status: v.optional(
      v.union(v.literal("PENDING_APPROVAL"), v.literal("APPROVED_PENDING_PAYMENT"), v.literal("PAID"), v.literal("REJECTED"))
    )
  },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("purchaseRequests")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(100);
    }

    return await ctx.db.query("purchaseRequests").order("desc").take(100);
  }
});
