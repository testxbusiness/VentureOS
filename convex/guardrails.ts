import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const DEFAULT_BLOCKED = [
  "diagnosi",
  "diagnosticare",
  "rischio clinico",
  "prescrizione",
  "farmaco",
  "terapia",
  "doctor-approved",
  "safe for baby",
  "medical advice",
  "consult your doctor"
];

export const upsertCompanyGuardrails = mutation({
  args: {
    updatedBy: v.string(),
    rules: v.array(v.string()),
    blockedTerms: v.optional(v.array(v.string())),
    requiredDisclaimers: v.optional(v.array(v.string()))
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("guardrails")
      .withIndex("by_scope", (q) => q.eq("scope", "company"))
      .first();

    const payload = {
      scope: "company",
      rules: args.rules,
      blockedTerms: args.blockedTerms ?? DEFAULT_BLOCKED,
      requiredDisclaimers:
        args.requiredDisclaimers ?? ["This app is for emotional and organizational support only.", "No medical advice."]
    };

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...payload,
        updatedBy: args.updatedBy,
        updatedAt: now
      });
      return existing._id;
    }

    return await ctx.db.insert("guardrails", {
      ...payload,
      updatedBy: args.updatedBy,
      updatedAt: now
    });
  }
});

export const getCompanyGuardrails = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("guardrails")
      .withIndex("by_scope", (q) => q.eq("scope", "company"))
      .first();
  }
});
