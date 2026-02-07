import { mutation } from "./_generated/server";

export const initWorkspace = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("guardrails")
      .withIndex("by_scope", (q) => q.eq("scope", "company"))
      .first();

    if (!existing) {
      await ctx.db.insert("guardrails", {
        scope: "company",
        rules: [
          "No medical advice, diagnosis, or risk claims",
          "All irreversible actions must be approved",
          "No automatic spend"
        ],
        blockedTerms: [
          "diagnosi",
          "rischio clinico",
          "prescrizione",
          "farmaco",
          "terapia",
          "medical advice",
          "consult your doctor"
        ],
        requiredDisclaimers: [
          "This product is for emotional and organizational support only.",
          "No medical advice."
        ],
        updatedBy: "system",
        updatedAt: Date.now()
      });
    }

    return { ok: true };
  }
});
