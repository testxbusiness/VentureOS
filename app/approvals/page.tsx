"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";

function ageFromTimestamp(ts: number) {
  const diffMs = Date.now() - ts;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function ApprovalQueuePage() {
  const queue = useQuery(api.approvals.listApprovalQueue, {});
  const decideApproval = useMutation(api.approvals.decideApproval);
  const items = (queue ?? []) as Doc<"ventureApprovals">[];

  return (
    <main className="container">
      <section className="hero">
        <span className="kicker">Approval Queue</span>
        <h1>Human Checkpoints</h1>
        <p>Tutte le decisioni critiche passano da approvazione manuale prima della prosecuzione pipeline.</p>
      </section>

      {queue === undefined ? <p>Loading approvals...</p> : null}

      <section className="list">
        {items.map((item) => (
          <article className="item" key={item._id}>
            <strong>{item.checkpointType}</strong>
            <div>run: {item.runId}</div>
            <div>requested by: {item.requestedBy}</div>
            <div>age: {ageFromTimestamp(item.createdAt)}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              <button
                className="button"
                onClick={() => decideApproval({ approvalId: item._id, decision: "approved", reviewer: "ceo" })}
              >
                Approve
              </button>
              <button
                className="button"
                onClick={() => decideApproval({ approvalId: item._id, decision: "rejected", reviewer: "ceo" })}
              >
                Reject
              </button>
              <Link className="button" href={`/runs/${item.runId}`}>
                Open Run
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
