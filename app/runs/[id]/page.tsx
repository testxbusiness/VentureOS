"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";

const CHECKPOINTS = ["NICHE_BRIEF", "TRIGGER_MAP", "SHORTLIST", "PNL_RISK_GO_NO_GO", "SOCIAL_PACK_FINAL"] as const;

export default function RunDetailPage() {
  const params = useParams<{ id: string }>();
  const runId = params.id as Id<"ventureRuns">;

  const detail = useQuery(api.runs.getRunDetail, { runId });
  const audit = useQuery(api.audit.listRunAudit, { runId }) as Doc<"ventureAuditLog">[] | undefined;

  const rerunStep = useMutation(api.runs.rerunStep);
  const runA1NicheIntake = useMutation(api.agents.runA1NicheIntake);
  const runA2MarketSignals = useMutation(api.agents.runA2MarketSignals);
  const runA3Voc = useMutation(api.agents.runA3Voc);
  const runA4TriggerMap = useMutation(api.agents.runA4TriggerMap);
  const requestApproval = useMutation(api.approvals.requestApproval);
  const completeRun = useMutation(api.steps.completeRun);

  const [checkpointType, setCheckpointType] = useState<(typeof CHECKPOINTS)[number]>("TRIGGER_MAP");
  const [stepKey, setStepKey] = useState("");
  const [requestPayload, setRequestPayload] = useState("{}");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const steps = useMemo(() => (detail?.steps ?? []) as Doc<"ventureRunSteps">[], [detail]);

  async function onRequestApproval(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionError(null);
    setActionMessage(null);
    try {
      const payload = requestPayload.trim() ? JSON.parse(requestPayload) : undefined;
      await requestApproval({
        runId,
        checkpointType,
        stepKey: stepKey.trim() || undefined,
        payload,
        requestedBy: "orchestrator"
      });
      setActionMessage("Approval request created.");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Approval request failed");
    }
  }

  return (
    <main className="container">
      <section className="hero">
        <span className="kicker">Run Detail</span>
        <h1>{runId}</h1>
        <p>Timeline step-by-step con artefatti, punteggi, rischi e stato approvazioni.</p>
      </section>

      <section className="panel">
        <h2>Run snapshot</h2>
        {detail === undefined ? <p>Loading run detail...</p> : null}
        {detail ? (
          <div>
            <div>niche: {detail.run.niche}</div>
            <div>status: {detail.run.status}</div>
            <div>current step: {detail.run.currentStep ?? "-"}</div>
          </div>
        ) : null}
      </section>

      <section className="panel">
        <h2>Step timeline</h2>
        <div className="list">
          {steps.map((step) => (
            <article className="item" key={step._id}>
              <strong>{step.stepKey}</strong>
              <div>status: {step.status}</div>
              <button
                className="button"
                style={{ marginTop: 8 }}
                onClick={() => rerunStep({ runId, stepKey: step.stepKey, actor: "ceo" })}
              >
                Rerun Step
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Request checkpoint approval</h2>
        <form className="list" onSubmit={onRequestApproval}>
          <select value={checkpointType} onChange={(e) => setCheckpointType(e.target.value as (typeof CHECKPOINTS)[number])}>
            {CHECKPOINTS.map((cp) => (
              <option key={cp} value={cp}>
                {cp}
              </option>
            ))}
          </select>
          <input value={stepKey} onChange={(e) => setStepKey(e.target.value)} placeholder="Optional step key" />
          <textarea
            value={requestPayload}
            onChange={(e) => setRequestPayload(e.target.value)}
            placeholder="JSON payload"
            rows={4}
          />
          {actionError ? <div style={{ color: "#b42318" }}>{actionError}</div> : null}
          <button className="button" type="submit">
            Request Approval
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>Run actions</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            className="button"
            onClick={async () => {
              setActionError(null);
              setActionMessage(null);
              try {
                await runA1NicheIntake({ runId, actor: "ceo" });
                setActionMessage("A1 completed and checkpoint requested.");
              } catch (e) {
                setActionError(e instanceof Error ? e.message : "A1 failed");
              }
            }}
          >
            Run A1 Niche Intake
          </button>
          <button
            className="button"
            onClick={async () => {
              setActionError(null);
              setActionMessage(null);
              try {
                await runA2MarketSignals({ runId, actor: "ceo" });
                setActionMessage("A2 Market Signals completed.");
              } catch (e) {
                setActionError(e instanceof Error ? e.message : "A2 failed");
              }
            }}
          >
            Run A2 Market Signals
          </button>
          <button
            className="button"
            onClick={async () => {
              setActionError(null);
              setActionMessage(null);
              try {
                const result = await runA3Voc({ runId, actor: "ceo" });
                setActionMessage(
                  `A3 VoC completed (${result.snippetCount} snippets, ${result.topThemeCount} top themes).`
                );
              } catch (e) {
                setActionError(e instanceof Error ? e.message : "A3 failed");
              }
            }}
          >
            Run A3 VoC
          </button>
          <button
            className="button"
            onClick={async () => {
              setActionError(null);
              setActionMessage(null);
              try {
                const result = await runA4TriggerMap({ runId, actor: "ceo" });
                setActionMessage(`A4 Trigger Map completed and sent to approval (${result.triggerCount} triggers).`);
              } catch (e) {
                setActionError(e instanceof Error ? e.message : "A4 failed");
              }
            }}
          >
            Run A4 Trigger Map
          </button>
          <button className="button" onClick={() => completeRun({ runId, status: "completed", actor: "ceo" })}>
            Mark Completed
          </button>
          <button className="button" onClick={() => completeRun({ runId, status: "blocked", actor: "ceo" })}>
            Mark Blocked
          </button>
          <button className="button" onClick={() => completeRun({ runId, status: "failed", actor: "ceo" })}>
            Mark Failed
          </button>
        </div>
        {actionMessage ? <div style={{ marginTop: 10, color: "#0f766e" }}>{actionMessage}</div> : null}
        {actionError ? <div style={{ marginTop: 10, color: "#b42318" }}>{actionError}</div> : null}
      </section>

      <section className="panel">
        <h2>VoC snippets</h2>
        <div className="list">
          {(detail?.vocSnippets ?? []).map((snippet) => (
            <article className="item" key={snippet._id}>
              <strong>{snippet.source}</strong>
              <div>{snippet.snippet}</div>
              <div>tags: {snippet.tags.join(", ")}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Audit log</h2>
        <div className="list">
          {(audit ?? []).map((entry) => (
            <article className="item" key={entry._id}>
              <strong>{entry.action}</strong>
              <div>actor: {entry.actor}</div>
              <div>entity: {entry.entityType}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Navigation</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="button" href="/approvals">
            Go to Approval Queue
          </Link>
          <Link className="button" href="/runs">
            Back to Runs
          </Link>
        </div>
      </section>
    </main>
  );
}
