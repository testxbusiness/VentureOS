import { mutation } from "./_generated/server";
import { v } from "convex/values";

function nowIso() {
  return new Date().toISOString();
}

export const runA1NicheIntake = mutation({
  args: {
    runId: v.id("ventureRuns"),
    actor: v.string()
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) throw new Error("Run not found");

    const step = await ctx.db
      .query("ventureRunSteps")
      .withIndex("by_run_step", (q) => q.eq("runId", args.runId).eq("stepKey", "A1_NICHE_INTAKE"))
      .first();
    if (!step) throw new Error("A1 step not found");
    if (step.status === "needs_approval") throw new Error("A1 already waiting approval");

    const questions = [
      `Qual e il segmento prioritario dentro "${run.niche}"?`,
      `Qual e l outcome piu urgente da sbloccare nei prossimi 30 giorni?`,
      "Quale vincolo operativo e davvero non negoziabile (tempo, budget o canale)?"
    ];

    const brief = {
      generatedAt: nowIso(),
      principles: [
        "Un intake efficace riduce ambiguita su target, outcome e vincoli.",
        "Le ipotesi devono essere esplicite e verificabili nelle fasi successive.",
        "Il brief deve essere sufficiente per attivare Market Signals senza nuovi chiarimenti."
      ],
      framework: {
        niche: run.niche,
        geo: run.geo,
        language: run.language,
        capabilities: run.capabilities,
        constraints: run.constraints,
        assumptions: {
          persona: "builder/creator che vuole validare una micro-opportunita rapidamente",
          jtbd: "identificare una proposta monetizzabile e distribuibile in tempi brevi",
          channels: ["search", "community", "short-form video"]
        }
      },
      deliverable: {
        nicheBrief: {
          targetPersona: "Creator/solo builder con bisogno di validazione rapida",
          primaryJTBD: "Passare da idea vaga a piano testabile in 2 settimane",
          topConstraints: run.constraints,
          blockingQuestions: questions
        },
        checklist: [
          "Target definito",
          "JTBD esplicito",
          "Vincoli non negoziabili espliciti",
          "Massimo 3 domande bloccanti"
        ]
      }
    };

    const now = Date.now();
    await ctx.db.patch(step._id, {
      status: "needs_approval",
      output: brief,
      evidenceRefs: [`run:${run._id}:a1:intake`],
      startedAt: step.startedAt ?? now,
      finishedAt: now,
      updatedAt: now
    });

    await ctx.db.patch(run._id, {
      status: "awaiting_approval",
      currentStep: "A1_NICHE_INTAKE",
      updatedAt: now
    });

    const artifactId = await ctx.db.insert("ventureArtifacts", {
      runId: run._id,
      stepKey: "A1_NICHE_INTAKE",
      artifactType: "niche_brief",
      format: "json",
      title: "Niche Brief (A1)",
      content: brief,
      evidenceRefs: [`run:${run._id}:a1:intake`],
      version: 1,
      createdAt: now
    });

    const approvalId = await ctx.db.insert("ventureApprovals", {
      runId: run._id,
      stepId: step._id,
      checkpointType: "NICHE_BRIEF",
      status: "pending",
      payload: {
        summary: "Review Niche Brief before moving to A2.",
        artifactId
      },
      requestedBy: args.actor,
      reviewedBy: undefined,
      decisionNote: undefined,
      createdAt: now,
      updatedAt: now
    });

    await ctx.db.insert("ventureAuditLog", {
      runId: run._id,
      entityType: "approval",
      entityId: approvalId,
      action: "APPROVAL_REQUESTED",
      actor: args.actor,
      details: { checkpointType: "NICHE_BRIEF", stepKey: "A1_NICHE_INTAKE" },
      createdAt: now
    });

    return { stepId: step._id, artifactId, approvalId };
  }
});

export const runA2MarketSignals = mutation({
  args: {
    runId: v.id("ventureRuns"),
    actor: v.string()
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) throw new Error("Run not found");

    const approvedBrief = await ctx.db
      .query("ventureApprovals")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .filter((q) => q.and(q.eq(q.field("checkpointType"), "NICHE_BRIEF"), q.eq(q.field("status"), "approved")))
      .first();

    if (!approvedBrief) {
      throw new Error("Niche Brief approval required before running A2");
    }

    const step = await ctx.db
      .query("ventureRunSteps")
      .withIndex("by_run_step", (q) => q.eq("runId", args.runId).eq("stepKey", "A2_MARKET_SIGNALS"))
      .first();
    if (!step) throw new Error("A2 step not found");

    const signals = {
      generatedAt: nowIso(),
      principles: [
        "Market Signals deve separare domanda osservabile da ipotesi speculative.",
        "Le opportunita si valutano su differenziazione e velocita di execution.",
        "I pattern monetizzazione aiutano a ridurre rischio go-to-market."
      ],
      framework: {
        landscapeLenses: ["demand", "competition", "distribution", "monetization"],
        niche: run.niche,
        geo: run.geo,
        language: run.language
      },
      deliverable: {
        competitorPatterns: [
          "Content-led acquisition + lead magnet",
          "Tool-first landing con waitlist",
          "Directory/listing con premium placement"
        ],
        monetizationPatterns: ["affiliate", "subscription micro-tool", "sponsored listing"],
        saturationLevel: "medium",
        differentiationOptions: [
          "Angle based on trigger-specific messaging",
          "Fast MVP with single high-value user job",
          "Localized positioning for geo/language"
        ],
        priorityChannels: ["SEO clusters", "YouTube Shorts", "community threads"],
        checklist: [
          "Landscape sintetizzato",
          "Monetization patterns identificati",
          "Saturazione e differenziazione esplicitate",
          "Canali prioritari suggeriti"
        ]
      }
    };

    const now = Date.now();
    await ctx.db.patch(step._id, {
      status: "completed",
      output: signals,
      evidenceRefs: [`run:${run._id}:a2:market-signals`],
      startedAt: step.startedAt ?? now,
      finishedAt: now,
      updatedAt: now
    });

    await ctx.db.patch(run._id, {
      status: "running",
      currentStep: "A2_MARKET_SIGNALS",
      updatedAt: now
    });

    const artifactId = await ctx.db.insert("ventureArtifacts", {
      runId: run._id,
      stepKey: "A2_MARKET_SIGNALS",
      artifactType: "market_landscape",
      format: "json",
      title: "Market Signals (A2)",
      content: signals,
      evidenceRefs: [`run:${run._id}:a2:market-signals`],
      version: 1,
      createdAt: now
    });

    await ctx.db.insert("ventureAuditLog", {
      runId: run._id,
      entityType: "agent",
      entityId: `A2:${run._id}`,
      action: "A2_COMPLETED",
      actor: args.actor,
      details: { artifactId },
      createdAt: now
    });

    return { stepId: step._id, artifactId };
  }
});
