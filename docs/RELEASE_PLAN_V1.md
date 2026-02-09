# VentureOS Release Plan (Reset Baseline)

## Milestone 0 - Reset tecnico (2-3 giorni)

Obiettivo: riallineare codice e dati al nuovo dominio VentureOS.

Deliverable:
- Refactor schema: entities run-centric (`runs`, `runSteps`, `approvals`, `artifacts`, `scores`, `riskFlags`, `socialPack`).
- Rimozione dipendenze dominio-specifiche legacy.
- Seed guardrail generici (no deceptive actions, no auto publishing/spend, compliance check).
- Dashboard skeleton: Runs, Approval Queue, Run Detail.

Exit criteria:
- Possibile creare un run e tracciarne gli step con stato e audit.

## Milestone 1 - Research -> Ideas -> Approval (MVP Core) (1-2 settimane)

Scope agenti: A0-A6.

Deliverable:
- A1 Niche Intake + max 3 blocking questions.
- A2 Market Signals con landscape e monetization patterns.
- A3 VoC dataset + top themes con evidenze.
- A4 Trigger Map emotivo/logica.
- A5 Idea generator (affiliate/directory/micro-webapp) 15-30 idee.
- A6 scoring rubric pesata + Top 3-5 shortlist.
- Checkpoint UI: brief/trigger/shortlist.

Exit criteria:
- Run completa fino a shortlist con approvazioni manuali.
- Export artefatti md/json/csv.

## Milestone 2 - PnL-lite + Risk + GO/NO-GO (4-6 giorni)

Scope agenti: A7-A8.

Deliverable:
- Scenari conservativo/base/ottimistico.
- KPI north star + leading indicators.
- Risk memo con mitigazioni e hard-stop.
- Checkpoint GO/NO-GO.

Exit criteria:
- Top idea con score + PnL-lite + risk card approvabile in dashboard.

## Milestone 3 - Social Pack 30 giorni (1-2 settimane)

Scope agenti social S1-S6.

Deliverable:
- Platform fit e content market fit.
- 5-8 pillars + 10 angles + CTA micro-funnel.
- Calendario 30 giorni con varianti hook A/B.
- Script/caption/comment templates + prompt creativi.
- Social QA policy gate + checkpoint approvazione.

Exit criteria:
- Pacchetto social completo esportabile e pronto per produzione manuale.

## Milestone 4 - Execution Planning (3-5 giorni)

Scope agente A9.

Deliverable:
- Roadmap 30/60/90.
- Backlog esperimenti.
- Export verso Linear/Notion/Jira.

Exit criteria:
- Run chiusa con piano operativo completo e task esportati.

## Milestone 5 - Learning Loop (v1+) (post-MVP)

Scope: S7 + feedback loop su rubric/scoring.

Deliverable:
- Ingest metriche reali post-pubblicazione.
- Iterazioni automatiche su pillars/angles.
- Aggiornamento pesi scoring con evidenza storica.
