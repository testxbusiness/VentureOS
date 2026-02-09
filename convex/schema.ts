import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ventureRuns: defineTable({
    niche: v.string(),
    geo: v.string(),
    language: v.string(),
    constraints: v.array(v.string()),
    capabilities: v.union(v.literal("dev"), v.literal("no_code"), v.literal("hybrid")),
    status: v.union(
      v.literal("draft"),
      v.literal("running"),
      v.literal("awaiting_approval"),
      v.literal("approved"),
      v.literal("blocked"),
      v.literal("completed"),
      v.literal("failed")
    ),
    currentStep: v.optional(v.string()),
    lockedAssumptions: v.optional(v.any()),
    seed: v.optional(v.string()),
    version: v.number(),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    createdBy: v.string(),
    updatedAt: v.number()
  })
    .index("by_status", ["status"])
    .index("by_updated", ["updatedAt"]),

  ventureRunSteps: defineTable({
    runId: v.id("ventureRuns"),
    stepKey: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("needs_approval"),
      v.literal("blocked"),
      v.literal("failed"),
      v.literal("skipped")
    ),
    input: v.optional(v.any()),
    output: v.optional(v.any()),
    evidenceRefs: v.array(v.string()),
    retryCount: v.number(),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
    updatedAt: v.number()
  })
    .index("by_run", ["runId"])
    .index("by_run_step", ["runId", "stepKey"])
    .index("by_status", ["status"]),

  ventureApprovals: defineTable({
    runId: v.id("ventureRuns"),
    stepId: v.optional(v.id("ventureRunSteps")),
    checkpointType: v.union(
      v.literal("NICHE_BRIEF"),
      v.literal("TRIGGER_MAP"),
      v.literal("SHORTLIST"),
      v.literal("PNL_RISK_GO_NO_GO"),
      v.literal("SOCIAL_PACK_FINAL")
    ),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    payload: v.optional(v.any()),
    requestedBy: v.string(),
    reviewedBy: v.optional(v.string()),
    decisionNote: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_status", ["status"])
    .index("by_run", ["runId"]),

  ventureArtifacts: defineTable({
    runId: v.id("ventureRuns"),
    stepKey: v.string(),
    artifactType: v.string(),
    format: v.union(v.literal("md"), v.literal("json"), v.literal("csv"), v.literal("table")),
    title: v.string(),
    content: v.any(),
    evidenceRefs: v.array(v.string()),
    version: v.number(),
    createdAt: v.number()
  })
    .index("by_run", ["runId"])
    .index("by_run_step", ["runId", "stepKey"]),

  ventureScores: defineTable({
    runId: v.id("ventureRuns"),
    ideaKey: v.string(),
    rubricVersion: v.string(),
    dimensions: v.any(),
    weights: v.any(),
    overallScore: v.number(),
    unknowns: v.array(v.string()),
    createdAt: v.number()
  })
    .index("by_run", ["runId"])
    .index("by_run_score", ["runId", "overallScore"]),

  ventureRiskFlags: defineTable({
    runId: v.id("ventureRuns"),
    scope: v.union(
      v.literal("idea"),
      v.literal("social"),
      v.literal("platform"),
      v.literal("legal"),
      v.literal("privacy"),
      v.literal("claims")
    ),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("hard_stop")),
    title: v.string(),
    description: v.string(),
    mitigation: v.optional(v.string()),
    status: v.union(v.literal("open"), v.literal("mitigated"), v.literal("accepted"), v.literal("waived")),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_run", ["runId"])
    .index("by_run_severity", ["runId", "severity"]),

  ventureSocialPacks: defineTable({
    runId: v.id("ventureRuns"),
    selectedIdeaKey: v.string(),
    platforms: v.array(v.string()),
    calendar30d: v.any(),
    scripts: v.any(),
    hooks: v.any(),
    ctas: v.any(),
    qaStatus: v.union(v.literal("pending"), v.literal("pass"), v.literal("fail")),
    qaNotes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_run", ["runId"]),

  ventureVocSnippets: defineTable({
    runId: v.id("ventureRuns"),
    source: v.string(),
    snippet: v.string(),
    tags: v.array(v.string()),
    url: v.optional(v.string()),
    createdAt: v.number()
  }).index("by_run", ["runId"]),

  ventureGuardrails: defineTable({
    scope: v.union(v.literal("global"), v.literal("run")),
    runId: v.optional(v.id("ventureRuns")),
    rules: v.array(v.string()),
    hardStops: v.array(v.string()),
    requiredHumanCheckpoints: v.array(v.string()),
    allowedDomains: v.optional(v.array(v.string())),
    blockedDomains: v.optional(v.array(v.string())),
    maxSourcesPerBatch: v.optional(v.number()),
    maxTokenBudgetPerBatch: v.optional(v.number()),
    maxCostUsdPerBatch: v.optional(v.number()),
    redactPII: v.optional(v.boolean()),
    updatedBy: v.string(),
    updatedAt: v.number()
  }).index("by_scope", ["scope"]),

  ventureAuditLog: defineTable({
    runId: v.optional(v.id("ventureRuns")),
    entityType: v.string(),
    entityId: v.string(),
    action: v.string(),
    actor: v.string(),
    details: v.any(),
    createdAt: v.number()
  })
    .index("by_run", ["runId"])
    .index("by_entity", ["entityType", "entityId"])
});
