# AI Business OS (Aligned to updated BusinessPRD)

Implementazione iniziale della tua AI company per "Emotional Pregnancy" (no medical), con CEO-in-the-loop per approvazioni e pagamenti.

## Stato attuale (allineato al nuovo PRD)

- Platform OS Convex con workflow `Propose -> Approve -> Execute`.
- Guardrail no-medical + audit log append-only.
- Purchase requests con pagamento manuale obbligatorio.
- Social queue con publish manuale.
- Finance foundation:
  - `ledgerEntries` + `budgets`
  - overview PnL/burn/runway
  - write automatico da purchase request pagata
  - ingest Stripe events verso ledger.
- Product Expansion foundation:
  - collections dedicate (`productIdeas`, `marketResearch`, `emotionInsights`, `productProposals`, `productArtifacts`, `ipChecks`, `listingQueue`)
  - queue listing manuale approvabile.
- LLM gateway unificato (MVP deterministic fallback) con validazione output minima e compliance check.
- CEO Console base con route:
  - `/` dashboard
  - `/proposals`
  - `/finance`

## File principali

- Convex schema: `/Users/famigliapoliti/Desktop/AI Business/convex/schema.ts`
- Proposals/approval flow: `/Users/famigliapoliti/Desktop/AI Business/convex/proposals.ts`
- Purchase flow: `/Users/famigliapoliti/Desktop/AI Business/convex/purchaseRequests.ts`
- Finance: `/Users/famigliapoliti/Desktop/AI Business/convex/finance.ts`
- Stripe ingest: `/Users/famigliapoliti/Desktop/AI Business/convex/stripe.ts`
- Product expansion: `/Users/famigliapoliti/Desktop/AI Business/convex/productExpansion.ts`
- LLM gateway: `/Users/famigliapoliti/Desktop/AI Business/convex/llmGateway.ts`
- Orchestrator: `/Users/famigliapoliti/Desktop/AI Business/convex/orchestrator.ts`
- Cron jobs: `/Users/famigliapoliti/Desktop/AI Business/convex/crons.ts`
- CEO home: `/Users/famigliapoliti/Desktop/AI Business/app/page.tsx`
- CEO finance: `/Users/famigliapoliti/Desktop/AI Business/app/finance/page.tsx`

## Run locale

```bash
cd '/Users/famigliapoliti/Desktop/AI Business'
npm install
cp .env.example .env.local
npm run convex:dev
# in altro terminale
npm run dev
```

## Gap residui verso DoD MVP

1. Collegare Clerk (RBAC CEO-only reale) su tutte le route console.
2. Sostituire UI mock con query/mutation Convex reali in `/proposals` e `/finance`.
3. Implementare webhook Stripe completo (signature verification + mapping eventi reali).
4. Kick Counter app live con funnel tracciato end-to-end.
5. Pipeline video (render_jobs -> GitHub Actions -> artifact callback).
