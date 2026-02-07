import { internalAction, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";

const PROJECTS = [
  { slug: "kick-counter", name: "Kick Counter", monthlyPrice: 6.99 },
  { slug: "pregnancy-week-snap", name: "Pregnancy Week Snap", monthlyPrice: 8.99 },
  { slug: "kegel-streak", name: "Kegel Streak", monthlyPrice: 5.99 }
];

function fallbackBatch(projectName: string) {
  return Array.from({ length: 10 }).map((_, i) => {
    const n = i + 1;
    return {
      title: `${projectName} Reel ${n}: little ritual, big calm`,
      script: [
        "Hook (0-3s): The smallest ritual can save your day.",
        "Body (4-20s): Show one practical emotional or organizational habit.",
        "CTA (21-30s): Save this for tonight and share with another mom."
      ],
      caption: "Emotional and organizational support only. No medical advice."
    };
  });
}

export const seedProjectsIfNeeded = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    for (const p of PROJECTS) {
      const existing = await ctx.db
        .query("projects")
        .withIndex("by_slug", (q) => q.eq("slug", p.slug))
        .first();
      if (!existing) {
        await ctx.db.insert("projects", {
          slug: p.slug,
          name: p.name,
          status: "active",
          pricingMonthlyEur: p.monthlyPrice,
          createdAt: now,
          updatedAt: now
        });
      }
    }
  }
});

export const dailyAutonomousRun = internalAction({
  args: {},
  handler: async (ctx) => {
    const runId = await ctx.runMutation(api.agentRuns.startRun, {
      agent: "orchestrator",
      input: { cadence: "daily" }
    });

    try {
      await ctx.runMutation(internal.orchestrator.seedProjectsIfNeeded, {});

      for (const project of PROJECTS) {
        let batch = fallbackBatch(project.name);

        try {
          const llm = await ctx.runAction(api.llmGateway.llmGateway, {
            agentName: "ScriptAndCaptionAgent",
            taskType: "daily_content_batch",
            input: {
              project: project.name,
              count: 10,
              constraints: ["no medical", "emotional/organizational only", "15-30s scripts"]
            },
            jsonSchema: {
              requiredKeys: ["summary", "items"]
            }
          });

          const generatedItems = (llm.output.items as unknown[] | undefined) ?? [];
          if (generatedItems.length > 0) {
            batch = generatedItems as Array<{ title: string; script: string[]; caption: string }>;
          }
        } catch {
          // Fallback is intentional: deterministic content keeps loop running when LLM fails.
        }

        const proposalId = await ctx.runMutation(api.proposals.createProposal, {
          projectSlug: project.slug,
          proposalType: "content_batch",
          title: `${project.name}: batch giornaliero 10 contenuti testuali`,
          summary: "Batch per social queue con copy no-medical e CTA orientata a journaling/routine.",
          payload: { items: batch, platform: "youtube" },
          riskLevel: "low",
          createdBy: "orchestrator",
          requiresApproval: true
        });

        await ctx.runMutation(api.artifacts.createArtifact, {
          projectSlug: project.slug,
          artifactType: "brief",
          sourceProposalId: proposalId,
          content: {
            objective: "Grow top-of-funnel with emotional and organizational positioning",
            batchCount: batch.length,
            notes: "CEO approval required before publication"
          }
        });
      }

      await ctx.runMutation(api.agentRuns.finishRun, {
        runId,
        status: "success",
        output: { projectsProcessed: PROJECTS.length }
      });
    } catch (error) {
      await ctx.runMutation(api.agentRuns.finishRun, {
        runId,
        status: "failed",
        output: { message: String(error) }
      });
      throw error;
    }
  }
});

export const weeklyBriefRun = internalAction({
  args: {},
  handler: async (ctx) => {
    const runId = await ctx.runMutation(api.agentRuns.startRun, {
      agent: "orchestrator_weekly",
      input: { cadence: "weekly" }
    });

    try {
      const date = new Date().toISOString().slice(0, 10);
      const overview = await ctx.runQuery(api.finance.getFinanceOverview, {});

      await ctx.runMutation(api.artifacts.createArtifact, {
        projectSlug: "portfolio",
        artifactType: "report",
        content: {
          date,
          summary:
            "Weekly brief generated. Includes growth focus, approval queue and finance snapshot for CEO decision-making.",
          actions:
            "Review proposals, approve highest ROI experiments, confirm pending purchases manually.",
          finance: overview
        }
      });

      await ctx.runMutation(api.productExpansion.createProductIdea, {
        title: `Weekly idea ${date}: emotional milestone cards bundle`,
        ideaType: "digital",
        targetEmotion: "calm and connection",
        actor: "orchestrator_weekly"
      });

      await ctx.runMutation(api.agentRuns.finishRun, {
        runId,
        status: "success",
        output: { briefDate: date }
      });
    } catch (error) {
      await ctx.runMutation(api.agentRuns.finishRun, {
        runId,
        status: "failed",
        output: { message: String(error) }
      });
      throw error;
    }
  }
});
