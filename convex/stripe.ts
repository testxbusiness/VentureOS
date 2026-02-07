import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

function toIsoDate(epoch: number) {
  const epochMs = epoch < 1_000_000_000_000 ? epoch * 1000 : epoch;
  return new Date(epochMs).toISOString().slice(0, 10);
}

export const ingestStripeEvent = mutation({
  args: {
    eventId: v.string(),
    eventType: v.string(),
    created: v.number(),
    amount: v.number(),
    currency: v.string(),
    projectSlug: v.optional(v.string()),
    note: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const typeMap: Record<string, { ledgerType: "revenue" | "fee" | "refund"; category: string }> = {
      "checkout.session.completed": { ledgerType: "revenue", category: "Subscriptions" },
      "charge.refunded": { ledgerType: "refund", category: "Refunds" },
      "balance.available": { ledgerType: "fee", category: "Stripe Fees" }
    };

    const mapped = typeMap[args.eventType];
    if (!mapped) {
      await ctx.runMutation(api.audit.appendAudit, {
        entityType: "stripe_event",
        entityId: args.eventId,
        action: "IGNORED",
        actor: "stripe_webhook",
        details: { eventType: args.eventType }
      });
      return { ignored: true };
    }

    const ledgerId = await ctx.runMutation(api.finance.recordStripeLedgerEntry, {
      date: toIsoDate(args.created),
      type: mapped.ledgerType,
      amount: args.amount,
      currency: args.currency.toUpperCase(),
      category: mapped.category,
      externalRef: args.eventId,
      projectSlug: args.projectSlug,
      note: args.note
    });

    await ctx.runMutation(api.audit.appendAudit, {
      entityType: "stripe_event",
      entityId: args.eventId,
      action: "INGESTED",
      actor: "stripe_webhook",
      details: {
        eventType: args.eventType,
        ledgerId
      }
    });

    return { ignored: false, ledgerId };
  }
});
