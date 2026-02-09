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

export const runA3Voc = mutation({
  args: {
    runId: v.id("ventureRuns"),
    actor: v.string()
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) throw new Error("Run not found");

    const a2Step = await ctx.db
      .query("ventureRunSteps")
      .withIndex("by_run_step", (q) => q.eq("runId", args.runId).eq("stepKey", "A2_MARKET_SIGNALS"))
      .first();
    if (!a2Step || a2Step.status !== "completed") {
      throw new Error("A2 Market Signals must be completed before running A3");
    }

    const step = await ctx.db
      .query("ventureRunSteps")
      .withIndex("by_run_step", (q) => q.eq("runId", args.runId).eq("stepKey", "A3_VOC"))
      .first();
    if (!step) throw new Error("A3 step not found");

    const sources = [
      "reddit_thread",
      "youtube_comment",
      "forum_post",
      "product_review",
      "x_reply",
      "community_chat"
    ] as const;

    const snippetSeeds = [
      {
        snippet: `Sto cercando una soluzione semplice per ${run.niche}, ma perdo tempo a mettere insieme strumenti separati.`,
        tags: ["pain:fragmented-workflow", "need:simplicity", "job:execution-speed"]
      },
      {
        snippet: `Ho bisogno di risultati visibili in 14 giorni, altrimenti mollo il progetto su ${run.niche}.`,
        tags: ["pain:slow-results", "desire:quick-wins", "job:validation"]
      },
      {
        snippet: "Le guide sono piene di teoria, ma mi manca una checklist pratica da eseguire ogni giorno.",
        tags: ["pain:too-much-theory", "need:daily-checklist", "job:actionability"]
      },
      {
        snippet: "Mi blocco quando devo scegliere il canale: SEO, community o short video?",
        tags: ["pain:channel-confusion", "objection:choice-overload", "job:distribution"]
      },
      {
        snippet: `Se non vedo un esempio reale nello stesso mercato (${run.geo}/${run.language}), faccio fatica a fidarmi.`,
        tags: ["objection:proof-gap", "need:local-evidence", "job:trust-building"]
      },
      {
        snippet: "Posso investire poco budget, ma voglio capire quale test mi da il segnale migliore.",
        tags: ["constraint:low-budget", "need:prioritized-tests", "job:risk-reduction"]
      },
      {
        snippet: "Non voglio una strategia completa adesso, mi serve solo il prossimo passo chiaro.",
        tags: ["desire:clarity", "need:next-best-action", "job:momentum"]
      },
      {
        snippet: "Quando vedo linguaggio troppo tecnico smetto di leggere subito.",
        tags: ["pain:complex-language", "need:plain-language", "job:fast-comprehension"]
      },
      {
        snippet: "Vorrei un modo per riutilizzare lo stesso insight in contenuti e idea business senza ripartire da zero.",
        tags: ["need:reuse-insights", "desire:leverage", "job:consistency"]
      },
      {
        snippet: "Mi interessa monetizzare senza dipendere solo da ads o vanity metrics.",
        tags: ["desire:monetization-clarity", "objection:vanity-metrics", "job:sustainable-growth"]
      }
    ] as const;

    const existing = await ctx.db
      .query("ventureVocSnippets")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .collect();
    for (const item of existing) {
      await ctx.db.delete(item._id);
    }

    const now = Date.now();
    const snippetRecords: Array<{
      id: string;
      source: (typeof sources)[number];
      snippet: string;
      tags: string[];
    }> = [];
    for (const [index, seed] of snippetSeeds.entries()) {
      const source = sources[index % sources.length];
      const snippetId = await ctx.db.insert("ventureVocSnippets", {
        runId: args.runId,
        source,
        snippet: seed.snippet,
        tags: [...seed.tags],
        url: `https://example.com/${source}/${index + 1}`,
        createdAt: now
      });

      snippetRecords.push({
        id: String(snippetId),
        source,
        snippet: seed.snippet,
        tags: [...seed.tags]
      });
    }

    const tagCount = new Map<string, number>();
    for (const item of snippetRecords) {
      for (const tag of item.tags) {
        tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1);
      }
    }

    const topThemes = [...tagCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([tag, count]) => {
        const evidenceRefs = snippetRecords
          .filter((item) => item.tags.includes(tag))
          .slice(0, 3)
          .map((item) => `voc_snippet:${item.id}`);
        return { theme: tag, count, evidenceRefs };
      });

    const vocOutput = {
      generatedAt: nowIso(),
      principles: [
        "VoC deve riportare linguaggio reale e non inferenze astratte.",
        "Ogni tema prioritario deve essere ancorato a snippet verificabili.",
        "I temi devono guidare A4 Trigger Map e A5 Idea Generation."
      ],
      dataset: {
        runContext: {
          niche: run.niche,
          geo: run.geo,
          language: run.language
        },
        snippetCount: snippetRecords.length,
        sources: [...new Set(snippetRecords.map((item) => item.source))]
      },
      deliverable: {
        topThemes,
        checklist: [
          "Snippet raccolti con source e tag",
          "Top temi con conteggio",
          "Evidenze collegate a ogni tema",
          "Output pronto per Trigger Map (A4)"
        ]
      }
    };

    const evidenceRefs = snippetRecords.map((item) => `voc_snippet:${item.id}`);

    await ctx.db.patch(step._id, {
      status: "completed",
      output: vocOutput,
      evidenceRefs,
      startedAt: step.startedAt ?? now,
      finishedAt: now,
      updatedAt: now
    });

    await ctx.db.patch(run._id, {
      status: "running",
      currentStep: "A3_VOC",
      updatedAt: now
    });

    const artifactId = await ctx.db.insert("ventureArtifacts", {
      runId: run._id,
      stepKey: "A3_VOC",
      artifactType: "voc_themes",
      format: "json",
      title: "VoC Dataset & Top Themes (A3)",
      content: vocOutput,
      evidenceRefs,
      version: 1,
      createdAt: now
    });

    await ctx.db.insert("ventureAuditLog", {
      runId: run._id,
      entityType: "agent",
      entityId: `A3:${run._id}`,
      action: "A3_COMPLETED",
      actor: args.actor,
      details: { artifactId, snippetCount: snippetRecords.length, topThemeCount: topThemes.length },
      createdAt: now
    });

    return { stepId: step._id, artifactId, snippetCount: snippetRecords.length, topThemeCount: topThemes.length };
  }
});

export const runA4TriggerMap = mutation({
  args: {
    runId: v.id("ventureRuns"),
    actor: v.string()
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) throw new Error("Run not found");

    const a3Step = await ctx.db
      .query("ventureRunSteps")
      .withIndex("by_run_step", (q) => q.eq("runId", args.runId).eq("stepKey", "A3_VOC"))
      .first();
    if (!a3Step || a3Step.status !== "completed") {
      throw new Error("A3 VoC must be completed before running A4");
    }

    const step = await ctx.db
      .query("ventureRunSteps")
      .withIndex("by_run_step", (q) => q.eq("runId", args.runId).eq("stepKey", "A4_TRIGGER_MAP"))
      .first();
    if (!step) throw new Error("A4 step not found");
    if (step.status === "needs_approval") throw new Error("A4 already waiting approval");

    const rawThemes = ((a3Step.output as { deliverable?: { topThemes?: Array<{ theme: string; count: number }> } })?.deliverable
      ?.topThemes ?? []) as Array<{ theme: string; count: number }>;
    if (rawThemes.length === 0) {
      throw new Error("A3 output has no top themes to map");
    }

    const topThemes = rawThemes.slice(0, 5);
    const emotionalTriggerByTheme: Record<string, string[]> = {
      "pain:fragmented-workflow": ["frustrazione da dispersione", "ansia da overload operativo"],
      "pain:slow-results": ["paura di sprecare tempo", "sfiducia nel processo"],
      "pain:channel-confusion": ["paralisi decisionale", "timore di scegliere il canale sbagliato"],
      "objection:proof-gap": ["insicurezza", "bisogno di prova sociale"],
      "constraint:low-budget": ["ansia da rischio economico", "avversione alla perdita"],
      "desire:clarity": ["sollievo da complessita", "senso di controllo"],
      "desire:quick-wins": ["motivazione immediata", "ricerca di momentum"],
      "desire:monetization-clarity": ["bisogno di prevedibilita", "senso di fattibilita"]
    };

    const logicalTriggerByTheme: Record<string, string[]> = {
      "pain:fragmented-workflow": ["workflow in 1 pagina", "priorita giornaliera unica"],
      "pain:slow-results": ["metrica leading entro 7 giorni", "test con outcome binario"],
      "pain:channel-confusion": ["framework di scelta canale", "criteri comparabili per canale"],
      "objection:proof-gap": ["case locale", "evidenze tracciabili"],
      "constraint:low-budget": ["test minimo costo", "ordine esperimenti per ROI atteso"],
      "desire:clarity": ["next step esplicito", "checklist operativa"],
      "desire:quick-wins": ["milestone 48h", "risultato parziale misurabile"],
      "desire:monetization-clarity": ["mappa monetizzazione", "funnel base conversione"]
    };

    const antiMessages = [
      "Promesse di risultato garantito o facile.",
      "Messaggi generici senza prova o contesto locale.",
      "Linguaggio tecnico non traducibile in azione immediata.",
      "Focalizzazione su vanity metrics al posto di outcome economici."
    ];

    const triggerItems = topThemes.map((item) => ({
      theme: item.theme,
      evidenceWeight: item.count,
      emotionalTriggers: emotionalTriggerByTheme[item.theme] ?? ["desiderio di semplificazione", "riduzione incertezza"],
      logicalTriggers: logicalTriggerByTheme[item.theme] ?? ["passo operativo successivo", "criterio decisionale chiaro"],
      suggestedMessageAngles: [
        `Parti da ${item.theme} con un solo passo eseguibile oggi.`,
        "Mostra evidenza concreta prima di proporre una strategia completa."
      ]
    }));

    const triggerMap = {
      generatedAt: nowIso(),
      principles: [
        "Ogni trigger deriva dai top themes della VoC.",
        "Il messaging deve bilanciare leva emotiva e prova logica.",
        "Anti-messaggi esplicitano cosa evitare in copy e contenuti."
      ],
      deliverable: {
        triggerItems,
        antiMessages,
        checklist: [
          "Trigger emotivi mappati sui top themes",
          "Trigger logici orientati ad azione e prova",
          "Anti-messaggi espliciti",
          "Pronto per Idea Generation (A5)"
        ]
      }
    };

    const vocEvidenceRefs = (a3Step.evidenceRefs ?? []).slice(0, 12);
    const now = Date.now();
    await ctx.db.patch(step._id, {
      status: "needs_approval",
      output: triggerMap,
      evidenceRefs: vocEvidenceRefs,
      startedAt: step.startedAt ?? now,
      finishedAt: now,
      updatedAt: now
    });

    await ctx.db.patch(run._id, {
      status: "awaiting_approval",
      currentStep: "A4_TRIGGER_MAP",
      updatedAt: now
    });

    const artifactId = await ctx.db.insert("ventureArtifacts", {
      runId: run._id,
      stepKey: "A4_TRIGGER_MAP",
      artifactType: "trigger_map",
      format: "json",
      title: "Trigger Map (A4)",
      content: triggerMap,
      evidenceRefs: vocEvidenceRefs,
      version: 1,
      createdAt: now
    });

    const approvalId = await ctx.db.insert("ventureApprovals", {
      runId: run._id,
      stepId: step._id,
      checkpointType: "TRIGGER_MAP",
      status: "pending",
      payload: {
        summary: "Review Trigger Map before moving to A5.",
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
      details: { checkpointType: "TRIGGER_MAP", stepKey: "A4_TRIGGER_MAP", artifactId },
      createdAt: now
    });

    return { stepId: step._id, artifactId, approvalId, triggerCount: triggerItems.length };
  }
});
