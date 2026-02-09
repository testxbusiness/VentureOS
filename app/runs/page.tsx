"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export default function RunsPage() {
  const runs = useQuery(api.runs.listRuns, {});
  const createRun = useMutation(api.runs.createRun);

  const [niche, setNiche] = useState("");
  const [geo, setGeo] = useState("IT");
  const [language, setLanguage] = useState("it");
  const [constraints, setConstraints] = useState("human approval required, no auto publish, no auto spend");
  const [capabilities, setCapabilities] = useState<"dev" | "no_code" | "hybrid">("hybrid");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedRuns = useMemo(() => (runs ?? []).sort((a, b) => b.updatedAt - a.updatedAt), [runs]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!niche.trim()) {
      setError("Niche is required");
      return;
    }

    try {
      setIsSubmitting(true);
      const runId = (await createRun({
        niche: niche.trim(),
        geo: geo.trim(),
        language: language.trim(),
        constraints: constraints
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        capabilities,
        createdBy: "ceo"
      })) as Id<"ventureRuns">;

      window.location.href = `/runs/${runId}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create run");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="container">
      <section className="hero">
        <span className="kicker">Runs</span>
        <h1>Pipeline Runs</h1>
        <p>Avvia una run con input nicchia/geo/lingua e monitora lo stato step-by-step.</p>
      </section>

      <section className="panel">
        <h2>Create new run</h2>
        <form onSubmit={onSubmit} className="list">
          <input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="Niche" />
          <input value={geo} onChange={(e) => setGeo(e.target.value)} placeholder="Geo (e.g. IT)" />
          <input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="Language (e.g. it)" />
          <input
            value={constraints}
            onChange={(e) => setConstraints(e.target.value)}
            placeholder="Comma-separated constraints"
          />
          <select value={capabilities} onChange={(e) => setCapabilities(e.target.value as "dev" | "no_code" | "hybrid")}>
            <option value="hybrid">hybrid</option>
            <option value="dev">dev</option>
            <option value="no_code">no_code</option>
          </select>
          {error ? <div style={{ color: "#b42318" }}>{error}</div> : null}
          <button className="button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Run"}
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>Run list</h2>
        {runs === undefined ? <p>Loading runs...</p> : null}
        <div className="list">
          {sortedRuns.map((run) => (
            <article key={run._id} className="item">
              <strong>{run.niche}</strong>
              <div>run id: {run._id}</div>
              <div>status: {run.status}</div>
              <div>current step: {run.currentStep ?? "-"}</div>
              <Link className="button" href={`/runs/${run._id}`} style={{ marginTop: 10 }}>
                Open Run Detail
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
