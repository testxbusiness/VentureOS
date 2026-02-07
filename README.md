# VentureOS

<p align="left">
  <img src="ventureos_logo_assets/ventureos_logo_icon_dark.svg" alt="VentureOS logo" width="72" />
</p>

VentureOS è un sistema operativo agentico per costruire e far crescere prodotti digitali con approvazione umana sui passaggi critici.

In questa repository trovi la prima implementazione di una AI company orientata a:
- progettazione e iterazione di mini webapp,
- content factory per social,
- governance con approvazioni CEO,
- controllo finanziario con ledger e PnL.

## Core Principles

- Human-in-the-loop: le azioni sensibili passano da approvazione.
- No automatic spend: ogni spesa è richiesta, pagata manualmente e confermata.
- Compliance-first: guardrail applicati ai contenuti prima dell’esecuzione.
- Auditability: eventi e decisioni tracciati in audit log append-only.

## What’s Implemented

- Workflow `Propose -> Approve -> Execute` per iniziative prodotto, contenuto e operative.
- Guardrail layer con controlli no-medical.
- Purchase requests con stato approvazione e conferma pagamento manuale.
- Social queue con approvazione e publish manuale.
- Agent runtime su Convex con orchestrazione daily/weekly.
- LLM gateway unificato (MVP) con validazione output minima.
- Finance module:
  - `ledgerEntries` (revenue, expense, fee, refund)
  - `budgets`
  - overview PnL / burn / runway
  - registrazione spese da purchase request pagata
  - ingest eventi Stripe verso ledger
- Product expansion foundation con idea pipeline e listing queue.
- CEO Console (Next.js) con dashboard, proposals inbox e finance page.

## Tech Stack

- Next.js
- Convex
- React
- TypeScript
- Stripe (integration foundation)

## Brand Assets

- Logo assets: `ventureos_logo_assets/`
- Primary icon (SVG): `ventureos_logo_assets/ventureos_logo_icon.svg`
- Dark variant used in this README: `ventureos_logo_assets/ventureos_logo_icon_dark.svg`

## Project Structure

- `convex/schema.ts` — schema e indici principali
- `convex/proposals.ts` — flusso propose/approve/execute
- `convex/purchaseRequests.ts` — richieste acquisto e pagamento manuale
- `convex/finance.ts` — ledger, budget, PnL overview
- `convex/stripe.ts` — ingest eventi Stripe nel ledger
- `convex/orchestrator.ts` — cicli autonomi daily/weekly
- `convex/llmGateway.ts` — gateway LLM centralizzato (MVP)
- `convex/productExpansion.ts` — pipeline prodotti adiacenti
- `convex/crons.ts` — job schedulati
- `app/` — CEO Console (dashboard, proposals, finance)

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run convex:dev
# in another terminal
npm run dev
```

Open:
- `http://localhost:3000/`
- `http://localhost:3000/proposals`
- `http://localhost:3000/finance`

## Current Scope

La base è pronta per evolvere verso:
- auth/rbac CEO-only con Clerk,
- webhook Stripe completo con signature verification,
- UI connesse a query/mutation Convex reali,
- pipeline video rendering su GitHub Actions,
- mini webapp production-ready con funnel completo.
