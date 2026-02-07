import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

function monthFromDate(date: string) {
  return date.slice(0, 7);
}

function sum(items: number[]) {
  return items.reduce((acc, n) => acc + n, 0);
}

export const addManualLedgerEntry = mutation({
  args: {
    date: v.string(),
    type: v.union(v.literal("revenue"), v.literal("expense"), v.literal("fee"), v.literal("refund")),
    amount: v.number(),
    currency: v.string(),
    category: v.string(),
    vendor: v.optional(v.string()),
    projectSlug: v.optional(v.string()),
    note: v.optional(v.string()),
    attachment: v.optional(v.string()),
    actor: v.string()
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("ledgerEntries", {
      date: args.date,
      type: args.type,
      amount: args.amount,
      currency: args.currency,
      category: args.category,
      vendor: args.vendor,
      projectSlug: args.projectSlug,
      source: "manual",
      externalRef: undefined,
      note: args.note,
      attachment: args.attachment,
      reconciled: false,
      createdAt: now,
      updatedAt: now
    });

    await ctx.runMutation(api.audit.appendAudit, {
      entityType: "ledger_entry",
      entityId: id,
      action: "MANUAL_ENTRY_CREATED",
      actor: args.actor,
      details: { type: args.type, amount: args.amount, category: args.category }
    });

    return id;
  }
});

export const recordStripeLedgerEntry = mutation({
  args: {
    date: v.string(),
    type: v.union(v.literal("revenue"), v.literal("fee"), v.literal("refund")),
    amount: v.number(),
    currency: v.string(),
    category: v.string(),
    externalRef: v.string(),
    projectSlug: v.optional(v.string()),
    note: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("ledgerEntries", {
      date: args.date,
      type: args.type,
      amount: args.amount,
      currency: args.currency,
      category: args.category,
      vendor: "Stripe",
      projectSlug: args.projectSlug,
      source: "stripe",
      externalRef: args.externalRef,
      note: args.note,
      attachment: undefined,
      reconciled: true,
      createdAt: now,
      updatedAt: now
    });

    await ctx.runMutation(api.audit.appendAudit, {
      entityType: "ledger_entry",
      entityId: id,
      action: "STRIPE_ENTRY_CREATED",
      actor: "stripe_webhook",
      details: { type: args.type, amount: args.amount, externalRef: args.externalRef }
    });

    return id;
  }
});

export const createExpenseFromPurchase = mutation({
  args: {
    purchaseRequestId: v.id("purchaseRequests"),
    actor: v.string()
  },
  handler: async (ctx, args) => {
    const req = await ctx.db.get(args.purchaseRequestId);
    if (!req) throw new Error("Purchase request not found");
    if (req.status !== "PAID") throw new Error("Purchase request must be PAID before expense entry");

    const existing = await ctx.db
      .query("ledgerEntries")
      .withIndex("by_source", (q) => q.eq("source", "purchase_request"))
      .filter((q) => q.eq(q.field("externalRef"), String(req._id)))
      .first();

    if (existing) return existing._id;

    const now = Date.now();
    const iso = new Date(now).toISOString().slice(0, 10);

    const id = await ctx.db.insert("ledgerEntries", {
      date: iso,
      type: "expense",
      amount: req.amountEur,
      currency: "EUR",
      category: req.category ?? "Tools",
      vendor: req.vendor,
      projectSlug: req.projectSlug,
      source: "purchase_request",
      externalRef: String(req._id),
      note: req.item,
      attachment: req.paymentUrl,
      reconciled: true,
      createdAt: now,
      updatedAt: now
    });

    await ctx.runMutation(api.audit.appendAudit, {
      entityType: "ledger_entry",
      entityId: id,
      action: "PURCHASE_EXPENSE_CREATED",
      actor: args.actor,
      details: { purchaseRequestId: req._id, amount: req.amountEur }
    });

    return id;
  }
});

export const upsertBudget = mutation({
  args: {
    month: v.string(),
    category: v.string(),
    limitAmount: v.number(),
    currency: v.string(),
    alertThreshold: v.optional(v.number()),
    actor: v.string()
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("budgets")
      .withIndex("by_month_category", (q) => q.eq("month", args.month).eq("category", args.category))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        limitAmount: args.limitAmount,
        currency: args.currency,
        alertThreshold: args.alertThreshold ?? existing.alertThreshold,
        updatedAt: now
      });

      await ctx.runMutation(api.audit.appendAudit, {
        entityType: "budget",
        entityId: existing._id,
        action: "UPDATED",
        actor: args.actor,
        details: { month: args.month, category: args.category, limitAmount: args.limitAmount }
      });

      return existing._id;
    }

    const id = await ctx.db.insert("budgets", {
      month: args.month,
      category: args.category,
      limitAmount: args.limitAmount,
      currency: args.currency,
      alertThreshold: args.alertThreshold ?? 0.8,
      createdAt: now,
      updatedAt: now
    });

    await ctx.runMutation(api.audit.appendAudit, {
      entityType: "budget",
      entityId: id,
      action: "CREATED",
      actor: args.actor,
      details: { month: args.month, category: args.category, limitAmount: args.limitAmount }
    });

    return id;
  }
});

export const listLedgerEntries = query({
  args: {
    month: v.optional(v.string()),
    type: v.optional(v.union(v.literal("revenue"), v.literal("expense"), v.literal("fee"), v.literal("refund"))),
    source: v.optional(v.union(v.literal("stripe"), v.literal("manual"), v.literal("purchase_request"), v.literal("bank_import"))),
    category: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("ledgerEntries").order("desc").take(1000);
    return all.filter((entry) => {
      if (args.month && !entry.date.startsWith(args.month)) return false;
      if (args.type && entry.type !== args.type) return false;
      if (args.source && entry.source !== args.source) return false;
      if (args.category && entry.category !== args.category) return false;
      return true;
    });
  }
});

export const getFinanceOverview = query({
  args: {
    month: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const nowIso = new Date().toISOString().slice(0, 10);
    const month = args.month ?? monthFromDate(nowIso);

    const entries = await ctx.db.query("ledgerEntries").order("desc").take(2000);
    const monthly = entries.filter((x) => x.date.startsWith(month));

    const revenue = sum(monthly.filter((x) => x.type === "revenue").map((x) => x.amount));
    const fees = sum(monthly.filter((x) => x.type === "fee").map((x) => x.amount));
    const refunds = sum(monthly.filter((x) => x.type === "refund").map((x) => x.amount));
    const expenses = sum(monthly.filter((x) => x.type === "expense").map((x) => x.amount));
    const net = revenue - fees - refunds - expenses;

    const budgets = await ctx.db.query("budgets").withIndex("by_month", (q) => q.eq("month", month)).collect();
    const spentByCategory = new Map<string, number>();
    for (const entry of monthly.filter((x) => x.type === "expense" || x.type === "fee")) {
      spentByCategory.set(entry.category, (spentByCategory.get(entry.category) ?? 0) + entry.amount);
    }

    const budgetStatus = budgets.map((b) => {
      const spent = spentByCategory.get(b.category) ?? 0;
      const ratio = b.limitAmount > 0 ? spent / b.limitAmount : 0;
      return {
        category: b.category,
        limitAmount: b.limitAmount,
        spent,
        ratio,
        overThreshold: ratio >= b.alertThreshold,
        overBudget: spent > b.limitAmount
      };
    });

    const monthlyBurn = expenses + fees + refunds;
    const runwayMonths = monthlyBurn > 0 ? Math.max(0, net) / monthlyBurn : null;

    return {
      month,
      mrr: revenue,
      netRevenue: revenue - fees - refunds,
      burn: monthlyBurn,
      runwayMonths,
      pnl: {
        revenue,
        fees,
        refunds,
        opex: expenses,
        net
      },
      budgetStatus
    };
  }
});

export const getMonthlyPnl = query({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.db.query("ledgerEntries").order("desc").take(5000);
    const byMonth = new Map<
      string,
      { revenue: number; fees: number; refunds: number; opex: number; net: number }
    >();

    for (const e of entries) {
      const m = monthFromDate(e.date);
      const curr = byMonth.get(m) ?? { revenue: 0, fees: 0, refunds: 0, opex: 0, net: 0 };
      if (e.type === "revenue") curr.revenue += e.amount;
      if (e.type === "fee") curr.fees += e.amount;
      if (e.type === "refund") curr.refunds += e.amount;
      if (e.type === "expense") curr.opex += e.amount;
      curr.net = curr.revenue - curr.fees - curr.refunds - curr.opex;
      byMonth.set(m, curr);
    }

    return Array.from(byMonth.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([month, values]) => ({ month, ...values }));
  }
});
