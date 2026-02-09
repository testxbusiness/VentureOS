"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";

export default function HomePage() {
  const runs = useQuery(api.runs.listRuns, {}) as Doc<"ventureRuns">[] | undefined;
  const approvals = useQuery(api.approvals.listApprovalQueue, {});

  const stats = useMemo(() => {
    const list = runs ?? [];
    return {
      totalRuns: list.length,
      runningRuns: list.filter((r) => r.status === "running").length,
      waitingApprovals: approvals?.length ?? 0,
      blockedRuns: list.filter((r) => r.status === "blocked").length
    };
  }, [runs, approvals]);

  return (
    <main className="container">
      <section className="hero">
        <span className="kicker">VentureOS Dashboard</span>
        <h1>Run-Centric Venture Pipeline</h1>
        <p>
          Baseline M0: orchestrazione run, approval queue e audit trail per passare da nicchia a shortlist,
          social pack e roadmap con checkpoint human-in-the-loop.
        </p>
      </section>

      <section className="card-grid">
        <article className="card">
          <h3>Total Runs</h3>
          <p>{runs === undefined ? "..." : stats.totalRuns}</p>
        </article>
        <article className="card">
          <h3>Running</h3>
          <p>{runs === undefined ? "..." : stats.runningRuns}</p>
        </article>
        <article className="card">
          <h3>Waiting Approvals</h3>
          <p>{approvals === undefined ? "..." : stats.waitingApprovals}</p>
        </article>
        <article className="card">
          <h3>Blocked Runs</h3>
          <p>{runs === undefined ? "..." : stats.blockedRuns}</p>
        </article>
      </section>

      <section className="panel">
        <h2>Workspace</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="button" href="/runs">
            Open Runs
          </Link>
          <Link className="button" href="/approvals">
            Open Approval Queue
          </Link>
        </div>
      </section>
    </main>
  );
}
