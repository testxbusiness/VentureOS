import { mutation, query } from "./_generated/server";

export const initGlobalGuardrails = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("ventureGuardrails")
      .withIndex("by_scope", (q) => q.eq("scope", "global"))
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("ventureGuardrails", {
      scope: "global",
      runId: undefined,
      rules: [
        "No external action without approval",
        "No auto-publish",
        "No auto-spend",
        "No deceptive claims"
      ],
      hardStops: [
        "No scraping against platform TOS",
        "No fake reviews, impersonation or manipulation",
        "No sensitive health/finance promises"
      ],
      requiredHumanCheckpoints: [
        "NICHE_BRIEF",
        "TRIGGER_MAP",
        "SHORTLIST",
        "PNL_RISK_GO_NO_GO",
        "SOCIAL_PACK_FINAL"
      ],
      updatedBy: "system",
      updatedAt: Date.now()
    });
  }
});

export const getGlobalGuardrails = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("ventureGuardrails")
      .withIndex("by_scope", (q) => q.eq("scope", "global"))
      .first();
  }
});
