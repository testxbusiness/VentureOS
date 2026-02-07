import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  projects: defineTable({
    slug: v.string(),
    name: v.string(),
    status: v.union(v.literal("active"), v.literal("paused")),
    pricingMonthlyEur: v.number(),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_slug", ["slug"]),

  guardrails: defineTable({
    scope: v.string(),
    rules: v.array(v.string()),
    blockedTerms: v.array(v.string()),
    requiredDisclaimers: v.array(v.string()),
    updatedBy: v.string(),
    updatedAt: v.number()
  }).index("by_scope", ["scope"]),

  agentRuns: defineTable({
    agent: v.string(),
    status: v.union(v.literal("running"), v.literal("success"), v.literal("failed")),
    input: v.optional(v.any()),
    output: v.optional(v.any()),
    startedAt: v.number(),
    finishedAt: v.optional(v.number())
  }).index("by_agent", ["agent"]),

  proposals: defineTable({
    projectSlug: v.string(),
    proposalType: v.union(
      v.literal("feature"),
      v.literal("content_batch"),
      v.literal("experiment"),
      v.literal("purchase_request"),
      v.literal("social_publish"),
      v.literal("product_expansion"),
      v.literal("finance_adjustment")
    ),
    title: v.string(),
    summary: v.string(),
    payload: v.any(),
    riskLevel: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    requiresApproval: v.boolean(),
    status: v.union(
      v.literal("PROPOSED"),
      v.literal("APPROVED"),
      v.literal("DENIED"),
      v.literal("EXECUTED"),
      v.literal("FAILED")
    ),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_status", ["status"])
    .index("by_project", ["projectSlug"]),

  approvals: defineTable({
    proposalId: v.id("proposals"),
    reviewerId: v.string(),
    decision: v.union(v.literal("APPROVED"), v.literal("DENIED")),
    reason: v.optional(v.string()),
    createdAt: v.number()
  }).index("by_proposal", ["proposalId"]),

  purchaseRequests: defineTable({
    proposalId: v.id("proposals"),
    vendor: v.string(),
    item: v.string(),
    amountEur: v.number(),
    paymentUrl: v.string(),
    expectedRoi: v.string(),
    category: v.optional(v.string()),
    projectSlug: v.optional(v.string()),
    status: v.union(v.literal("PENDING_APPROVAL"), v.literal("APPROVED_PENDING_PAYMENT"), v.literal("PAID"), v.literal("REJECTED")),
    paidAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_status", ["status"]),

  artifacts: defineTable({
    projectSlug: v.string(),
    artifactType: v.union(
      v.literal("script"),
      v.literal("caption"),
      v.literal("brief"),
      v.literal("render_spec"),
      v.literal("report"),
      v.literal("product_pack")
    ),
    sourceProposalId: v.optional(v.id("proposals")),
    content: v.any(),
    createdAt: v.number()
  }).index("by_project", ["projectSlug"]),

  renderJobs: defineTable({
    projectSlug: v.string(),
    status: v.union(v.literal("queued"), v.literal("running"), v.literal("done"), v.literal("failed")),
    priority: v.number(),
    renderSpec: v.any(),
    outputArtifactId: v.optional(v.id("artifacts")),
    scheduledAt: v.number(),
    updatedAt: v.number()
  }).index("by_status", ["status"]),

  socialQueue: defineTable({
    projectSlug: v.string(),
    proposalId: v.id("proposals"),
    platform: v.union(v.literal("youtube"), v.literal("instagram"), v.literal("tiktok")),
    postCopy: v.string(),
    assetArtifactId: v.optional(v.id("artifacts")),
    status: v.union(v.literal("queued"), v.literal("approved"), v.literal("published"), v.literal("failed")),
    scheduledAt: v.number(),
    publishedAt: v.optional(v.number())
  }).index("by_status", ["status"]),

  metricsDaily: defineTable({
    date: v.string(),
    projectSlug: v.string(),
    productEvents: v.any(),
    contentMetrics: v.any(),
    revenueMetrics: v.any(),
    createdAt: v.number()
  })
    .index("by_date", ["date"])
    .index("by_project_and_date", ["projectSlug", "date"]),

  auditLog: defineTable({
    entityType: v.string(),
    entityId: v.string(),
    action: v.string(),
    actor: v.string(),
    details: v.any(),
    createdAt: v.number()
  }).index("by_entity", ["entityType", "entityId"]),

  viralVideos: defineTable({
    source: v.string(),
    videoId: v.string(),
    title: v.string(),
    url: v.string(),
    stats: v.any(),
    ingestedAt: v.number()
  }).index("by_source", ["source"]),

  viralInsights: defineTable({
    videoRef: v.string(),
    hooks: v.array(v.string()),
    emotionalAngles: v.array(v.string()),
    ctas: v.array(v.string()),
    editingCues: v.array(v.string()),
    createdAt: v.number()
  }),

  patternLibrary: defineTable({
    projectSlug: v.string(),
    patternType: v.union(v.literal("hook"), v.literal("story_arc"), v.literal("cta"), v.literal("visual_cue")),
    patternText: v.string(),
    score: v.number(),
    sourceRefs: v.array(v.string()),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_project", ["projectSlug"]),

  productIdeas: defineTable({
    title: v.string(),
    ideaType: v.union(v.literal("digital"), v.literal("pod"), v.literal("bundle")),
    targetEmotion: v.string(),
    status: v.union(v.literal("new"), v.literal("validated"), v.literal("rejected")),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_status", ["status"]),

  marketResearch: defineTable({
    ideaId: v.id("productIdeas"),
    competitors: v.array(v.any()),
    priceRange: v.string(),
    gaps: v.array(v.string()),
    createdAt: v.number()
  }).index("by_idea", ["ideaId"]),

  emotionInsights: defineTable({
    source: v.string(),
    cluster: v.string(),
    painPoints: v.array(v.string()),
    desiredOutcomes: v.array(v.string()),
    createdAt: v.number()
  }).index("by_source", ["source"]),

  productProposals: defineTable({
    ideaId: v.id("productIdeas"),
    title: v.string(),
    payload: v.any(),
    status: v.union(v.literal("PROPOSED"), v.literal("APPROVED"), v.literal("DENIED"), v.literal("EXECUTED")),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_status", ["status"]),

  productArtifacts: defineTable({
    ideaId: v.id("productIdeas"),
    artifactType: v.union(v.literal("listing_copy"), v.literal("mockup"), v.literal("pack_file"), v.literal("faq")),
    content: v.any(),
    createdAt: v.number()
  }).index("by_idea", ["ideaId"]),

  ipChecks: defineTable({
    ideaId: v.id("productIdeas"),
    status: v.union(v.literal("passed"), v.literal("warning"), v.literal("failed")),
    findings: v.array(v.string()),
    createdAt: v.number()
  }).index("by_idea", ["ideaId"]),

  listingQueue: defineTable({
    ideaId: v.id("productIdeas"),
    channel: v.string(),
    status: v.union(v.literal("queued"), v.literal("approved"), v.literal("published"), v.literal("failed")),
    listingPayload: v.any(),
    scheduledAt: v.number(),
    publishedAt: v.optional(v.number())
  }).index("by_status", ["status"]),

  ledgerEntries: defineTable({
    date: v.string(),
    type: v.union(v.literal("revenue"), v.literal("expense"), v.literal("fee"), v.literal("refund")),
    amount: v.number(),
    currency: v.string(),
    category: v.string(),
    vendor: v.optional(v.string()),
    projectSlug: v.optional(v.string()),
    source: v.union(v.literal("stripe"), v.literal("manual"), v.literal("purchase_request"), v.literal("bank_import")),
    externalRef: v.optional(v.string()),
    note: v.optional(v.string()),
    attachment: v.optional(v.string()),
    reconciled: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_date", ["date"])
    .index("by_type", ["type"])
    .index("by_source", ["source"])
    .index("by_category", ["category"]),

  budgets: defineTable({
    month: v.string(),
    category: v.string(),
    limitAmount: v.number(),
    currency: v.string(),
    alertThreshold: v.number(),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_month", ["month"])
    .index("by_month_category", ["month", "category"])
});
