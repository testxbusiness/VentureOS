import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

function escapeCsv(value: unknown): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes("\"") || str.includes("\n")) {
    return `"${str.replace(/"/g, "\"\"")}"`;
  }
  return str;
}

function flattenObject(input: unknown, prefix = ""): Array<{ key: string; value: string }> {
  if (input === null || typeof input !== "object") {
    return [{ key: prefix || "value", value: String(input ?? "") }];
  }

  if (Array.isArray(input)) {
    return input.flatMap((item, idx) => flattenObject(item, prefix ? `${prefix}[${idx}]` : `[${idx}]`));
  }

  const rows: Array<{ key: string; value: string }> = [];
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object") {
      rows.push(...flattenObject(value, next));
    } else {
      rows.push({ key: next, value: String(value ?? "") });
    }
  }
  return rows;
}

function toMarkdown(title: string, content: unknown): string {
  return `# ${title}\n\nGenerated export.\n\n\`\`\`json\n${JSON.stringify(content, null, 2)}\n\`\`\`\n`;
}

function toCsv(content: unknown): string {
  if (Array.isArray(content) && content.length > 0 && content.every((x) => x && typeof x === "object" && !Array.isArray(x))) {
    const keys = [...new Set(content.flatMap((item) => Object.keys(item as Record<string, unknown>)))];
    const header = keys.map(escapeCsv).join(",");
    const body = content
      .map((row) => keys.map((key) => escapeCsv((row as Record<string, unknown>)[key])).join(","))
      .join("\n");
    return `${header}\n${body}\n`;
  }

  const rows = flattenObject(content);
  const header = "key,value";
  const body = rows.map((row) => `${escapeCsv(row.key)},${escapeCsv(row.value)}`).join("\n");
  return `${header}\n${body}\n`;
}

export const createArtifact = mutation({
  args: {
    runId: v.id("ventureRuns"),
    stepKey: v.string(),
    artifactType: v.string(),
    format: v.union(v.literal("md"), v.literal("json"), v.literal("csv"), v.literal("table")),
    title: v.string(),
    content: v.any(),
    evidenceRefs: v.optional(v.array(v.string())),
    actor: v.string()
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("ventureArtifacts", {
      runId: args.runId,
      stepKey: args.stepKey,
      artifactType: args.artifactType,
      format: args.format,
      title: args.title,
      content: args.content,
      evidenceRefs: args.evidenceRefs ?? [],
      version: 1,
      createdAt: Date.now()
    });

    await ctx.runMutation(api.audit.appendAudit, {
      runId: args.runId,
      entityType: "artifact",
      entityId: id,
      action: "ARTIFACT_CREATED",
      actor: args.actor,
      details: { stepKey: args.stepKey, artifactType: args.artifactType }
    });

    return id;
  }
});

export const exportRunArtifacts = mutation({
  args: {
    runId: v.id("ventureRuns"),
    actor: v.string(),
    stepKeys: v.optional(v.array(v.string()))
  },
  handler: async (ctx, args) => {
    const targetSteps = new Set(
      args.stepKeys ?? [
        "A1_NICHE_INTAKE",
        "A2_MARKET_SIGNALS",
        "A3_VOC",
        "A4_TRIGGER_MAP",
        "A5_IDEA_GEN",
        "A6_SCORING"
      ]
    );

    const baseArtifacts = await ctx.db
      .query("ventureArtifacts")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .collect();

    const source = baseArtifacts.filter((item) => item.format === "json" && targetSteps.has(item.stepKey));
    if (source.length === 0) {
      throw new Error("No JSON artifacts found to export");
    }

    let created = 0;
    for (const item of source) {
      await ctx.db.insert("ventureArtifacts", {
        runId: item.runId,
        stepKey: item.stepKey,
        artifactType: `${item.artifactType}_md_export`,
        format: "md",
        title: `${item.title} (MD Export)`,
        content: toMarkdown(item.title, item.content),
        evidenceRefs: item.evidenceRefs,
        version: item.version + 1,
        createdAt: Date.now()
      });
      created += 1;

      await ctx.db.insert("ventureArtifacts", {
        runId: item.runId,
        stepKey: item.stepKey,
        artifactType: `${item.artifactType}_csv_export`,
        format: "csv",
        title: `${item.title} (CSV Export)`,
        content: toCsv(item.content),
        evidenceRefs: item.evidenceRefs,
        version: item.version + 1,
        createdAt: Date.now()
      });
      created += 1;
    }

    await ctx.runMutation(api.audit.appendAudit, {
      runId: args.runId,
      entityType: "artifact",
      entityId: String(args.runId),
      action: "ARTIFACTS_EXPORTED",
      actor: args.actor,
      details: { sourceCount: source.length, exportCount: created, formats: ["md", "csv"] }
    });

    return { sourceCount: source.length, exportCount: created };
  }
});

export const listArtifactsByRun = query({
  args: { runId: v.id("ventureRuns") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ventureArtifacts")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .order("desc")
      .take(300);
  }
});
