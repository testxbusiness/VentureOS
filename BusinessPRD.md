([Past chat][1])([Past chat][1])([Past chat][2])([Past chat][1])

# PRD — AI Company Autonoma per “Emotional Pregnancy” (Mini Webapp + Social Video + Prodotti Adiacenti)

**Stack vincolante:** Next.js (frontend) · Convex (backend) · Clerk (auth) · Stripe (pagamenti) · GitHub + Vercel (deploy) · GitHub Actions (video rendering)
**Principio chiave:** il sistema è autonomo su tutto **tranne**: (1) linee guida/guardrail e (2) approvazioni/pagamenti del CEO.

---

## 1) Visione

Costruire un’“azienda AI” che, dato un tema (qui: gravidanza **solo emozionale/organizzativo**, zero medicale), sia in grado di:

* progettare e iterare mini webapp,
* generare e gestire marketing social con contenuti video “factory”,
* analizzare trend/viral per migliorare creatività,
* scoprire e lanciare prodotti adiacenti (digital e print-on-demand),
* misurare performance e migliorare continuamente,
  con un’unica interfaccia per il CEO che governa guardrail, approva proposte e paga manualmente.

---

## 2) Obiettivi

### Obiettivi prodotto (MVP → scalabile)

1. **CEO Console**: guardrail, inbox proposte, approvazioni, richieste acquisto, queue pubblicazioni, dashboard KPI e **PnL**.
2. **Agent Platform** in Convex: scheduler/cron, agent runs, audit log, memorie/pattern, job queue.
3. **Una mini webapp iniziale** (Kick Counter) con paywall Stripe e analytics.
4. **Content factory**: batch script/caption + batch rendering video + queue pubblicazione.
5. **Viral Insight Agent** (YouTube-first) per alimentare pattern creativi.
6. **Product Expansion Pod** per nuovi prodotti adiacenti (digital + POD).
7. **Finance/PnL**: ledger unico, entrate auto da Stripe, spese manuali/da purchase request, opzionale agentico per categorizzazione/reconciliation.

### Obiettivi business

* Launch e crescita di almeno 1 app con funnel tracciato end-to-end: contenuto → signup → trial → paid.
* Ridurre tempo CEO: <15 min/giorno per approvare e pagare.

---

## 3) Vincoli e guardrail (non negoziabili)

1. **NO MEDICAL**: niente diagnosi, consigli clinici, valutazioni di rischio, “se succede X fai Y”. Solo emozionale/organizzativo/routine/memoria.
2. **No spese automatiche**: gli agenti generano **purchase request**; il CEO paga manualmente e conferma.
3. **Propose → Approve → Execute**: qualsiasi azione sensibile (spesa, pubblicazione, claim) passa da approvazione CEO.
4. **Auditabilità**: tutto loggato in append-only audit log (input, output, decisioni, motivazioni, esecuzioni).

---

## 4) Prodotti gestiti (portfolio)

### A) Mini webapp

1. **Kick Counter**

* MVP: tap counter, sessioni, grafico giornaliero, note
* Premium: report export, widget, promemoria avanzati
* Monetizzazione: €6.99/m trial

2. **Pregnancy Week Snap**

* MVP: timeline settimana, note, checklist, reminder (manuale)
* Premium: template checklist, export PDF “diario”
* Monetizzazione: €8.99/m trial

3. **Kegel Streak**

* MVP: timer, preset, reminder, streak
* Premium: programmi pack, widget, report
* Monetizzazione: €5.99/m trial

### B) Prodotti adiacenti (non medicali)

* Digital: journal, checklist pack, “week snap cards”, prompt per partner, template PDF/Canva
* POD: sticker, mug, t-shirt, poster milestone, bundle

---

## 5) Utenti e ruoli

* **CEO**: unico admin della CEO Console.
* **Utenti finali**: utilizzano mini webapp (tracking/journal/routine) e acquistano premium.
* (Futuro) Reviewer interno: opzionale.

---

## 6) Architettura del sistema

### Componenti principali

1. **CEO Console (Next.js)**

* Guardrail & budget
* Inbox proposte + approve/deny
* Purchase requests + “mark as paid”
* Social queue + publish (MVP manuale 1-click)
* Finance: Ledger + PnL + Budgets + Runway
* KPI: prodotto, social, revenue

2. **Mini Webapp (Next.js)**

* PWA mobile-first
* Stripe paywall/portal
* Event tracking verso Convex

3. **Convex (Company OS)**

* DB + file storage
* Scheduler cron (daily/weekly) + scheduled jobs
* Actions/mutations per agent runs
* Webhook Stripe
* Audit log

4. **GitHub + Vercel**

* CI/CD, preview PR, deploy prod

5. **GitHub Actions Renderer**

* Consuma render_jobs, genera MP4 via Remotion/FFmpeg, carica artifact e notifica Convex

---

## 7) Come operano gli agenti (runtime concreto)

Gli agenti sono **funzioni Convex** (actions) orchestrate da cron/eventi.
Quando devono creare insight/testi/brief, chiamano un **LLM via API** (server-side) tramite un **LLM Gateway** unico:

* `llmGateway(agentName, taskType, input, jsonSchema) -> outputJSON`
* applica guardrail (no-medical), valida output con schema, logga costi/usage, rate-limit.

**Parte deterministica**: ranking, dedup, scheduling, metriche.
**Parte generativa**: script, caption, briefing, sintesi competitor, pattern library, proposte.

---

## 8) Agenti (set completo)

### Core Ops

1. **Orchestrator Agent (CEO virtuale operativo)**

* Pianifica settimana/giorno, assegna task, apre proposals, coordina pipeline.

2. **Compliance Guard Agent (NO MEDICAL)**

* Valida ogni contenuto/proposta/testo; riscrive in safe-mode; blocca.

3. **Analytics & Learning Agent**

* Daily report + anomaly detection; weekly retro; aggiorna playbook/pattern; propone next actions.

### App & Growth

4. **Product Lead Agent**

* Backlog MVP, iterazioni paywall/UX, micro-feature.

5. **Growth/Experiment Agent**

* Definisce esperimenti (hook/copy/paywall), metriche successo/kill, propone raddoppio.

### Content Factory

6. **Content Strategist Agent**

* Serie, rubriche, content calendar, CTA e destinazioni.

7. **Script & Caption Agent**

* Script 15–30s, overlay, caption, hashtag, comment templates.

8. **Video Factory Agent**

* Trasforma brief/pattern in `render_specs` e crea `render_jobs` batch.

### Viral Intelligence

9. **Viral Insight Agent (YouTube-first)**

* Scopre video virali per keyword, estrae pattern (hook, emotional angle, struttura, CTA, editing cues), aggiorna pattern library.
* TikTok/IG: MVP via “seed links” inseriti dal CEO (senza scraping massivo).

### Product Expansion Pod (nuovi prodotti adiacenti)

10. **Adjacent Product Scout**

* Trova nuove linee prodotto (digital/POD/bundle) coerenti col brand emozionale.

11. **Market & Competitor Analyst**

* Mappa mercato, pricing, gap, angle differenziante.

12. **Needs & Emotion Miner**

* Trasforma feedback/commenti/review in cluster emozionali e bisogni azionabili.

13. **Product Builder (Digital + POD)**

* Genera asset pack vendibile: file, mockup, listing draft, FAQ, istruzioni.

14. **IP & Policy Guard**

* Blocca rischi di copyright/trademark e claim borderline.

15. **Listing & Fulfillment Ops**

* Prepara “upload pack” e crea `listingQueue` (MVP pubblicazione manuale).

### Finance

16. **Bookkeeper Agent (semi-agentico)**

* Categorizza transazioni, propone riconciliazioni, segnala anomalie (senza pagare).
* Richiede approvazione CEO per applicare modifiche.

17. **Cash Controller Agent**

* Forecast runway/burn, alert budget, propone tagli/stop.

---

## 9) Flussi end-to-end (chi fa cosa)

### 9.1 Operating Loop (giornaliero)

1. **Cron (Convex)** → Orchestrator avvia “Daily Cycle”
2. Analytics/Learning aggiorna KPI e segnala anomalie
3. Viral Insight aggiorna pattern library (YouTube)
4. Content Strategist genera piano contenuti del giorno/2-3 giorni
5. Script & Caption produce batch (JSON) → Compliance Guard valida
6. Video Factory crea render_jobs → attende approval CEO
7. CEO approva batch → GitHub Actions renderizza → artifacts pronti
8. Orchestrator popola socialQueue (READY)
9. CEO (MVP) fa publish 1-click per batch/coda
10. Metriche social e funnel vengono raccolte e alimentano il prossimo ciclo.

### 9.2 Iterazione prodotto (settimanale)

1. Orchestrator sceglie focus (Kick Counter)
2. Product Lead propone micro-iterazioni
3. Compliance Guard valida copy/paywall
4. CEO approva → Executor crea task di implementazione (PR/merge) → deploy Vercel
5. Growth Agent imposta esperimenti e metriche → learning loop.

### 9.3 Product Expansion (settimanale)

1. Adjacent Scout propone 10 idee adiacenti
2. Analyst fa competitor/gap
3. Needs Miner mappa emozioni → opportunità
4. Builder crea pack (digital/POD)
5. IP Guard valida
6. CEO approva → ListingQueue/landing + Stripe checkout
7. Metrics aggiornate in PnL e report.

---

## 10) Finance & PnL (CEO Dashboard)

### Requisito

Aggiungere sezione **Finance** in CEO Console per monitorare:

* Entrate (Stripe)
* Spese (manuali + purchase requests + opzionale import)
* PnL mensile + runway + budget envelope

### Implementazione minima (robusta)

**Ledger unico (`ledgerEntries`)** con:

* date, type (revenue/expense/fee/refund), amount, currency
* category (Ads/Tools/Domain/Hosting/POD COGS/…)
* vendor, projectId, source (stripe/manual/purchase_request/bank_import), externalRef, note, attachment

**Entrate auto**: Stripe webhook → `ledgerEntries` revenue + fee/refund.
**Spese**: `purchaseRequests` → CEO “mark as paid” → crea `ledgerEntries expense`.
**Manual entry**: form “Add expense”.
**Opzionale**: import CSV banca → `bank_import` + reconciliation proposal (agentico).

### Pagine Finance

* Overview: MRR, net revenue, burn, runway, top cost categories
* PnL mensile: revenue/fees/refunds/opex/net per mese + drill-down
* Transactions: filtri + uncategorized + unreconciled
* Budgets: envelope per categoria + alert

### Finance agents (non pagano)

* Bookkeeper: categorizza/riconcili, propone fix
* Cash controller: alert budget/runway e consigli operativi

---

## 11) Data model (Convex collections minime)

* `projects`, `guardrails`
* `agentRuns`, `auditLog` (append-only)
* `proposals`, `approvals`
* `purchaseRequests`
* `artifacts` (script/caption/video/mockup/pdf)
* `renderJobs`
* `socialQueue`
* `metricsDaily`
* Viral: `viralVideos`, `viralInsights`, `patternLibrary`
* Product expansion: `productIdeas`, `marketResearch`, `emotionInsights`, `productProposals`, `productArtifacts`, `ipChecks`, `listingQueue`
* Finance: `ledgerEntries`, `budgets`

---

## 12) Requisiti non funzionali

* **Security**: segreti solo server-side (Convex env), RBAC (CEO-only)
* **Cost control**: rate limit LLM gateway + budget giornaliero token/costi
* **Reliability**: job idempotenti, retry controllato, dead-letter per job falliti
* **Observability**: log di run agenti, errori, tempi, costi, output validation
* **Privacy**: minimizzare dati personali; per contenuti emozionali usare pattern aggregati, non profili individuali.

---

## 13) KPI di successo (MVP)

* Pipeline completa operativa: proposals → approvals → execution → metrics
* Tempo CEO: <15 min/giorno
* Funnel tracciato: social → landing → signup → trial → paid
* PnL aggiornato: incassi auto da Stripe + spese via purchase requests/manual
* 14+ contenuti video/settimana generati e pubblicabili via queue

---

## 14) Roadmap suggerita (a fasi)

### Fase 1 — Platform OS + CEO Console (core)

* Guardrails, proposals/approvals, purchase requests, audit log
* LLM gateway con output JSON schema
* Social queue (manual publish)
* Finance ledger base + overview (PnL base)

### Fase 2 — App 1 (Kick Counter) + Stripe + analytics

* MVP webapp + eventi + paywall + webhook Stripe → ledger

### Fase 3 — Content factory video

* Template video + render_jobs + GitHub Actions renderer
* Batch approvals

### Fase 4 — Viral Insight + learning loop

* YouTube harvest → pattern library → migliori script/render

### Fase 5 — Product Expansion Pod

* Digital product pack + listing queue + IP guard + revenue tracking in PnL

### Fase 6 — Portfolio (3 app)

* Replicare framework su Week Snap e Kegel Streak

---

## 15) Non-goals (espliciti)

* Funzioni medicali/cliniche o consigli sanitari
* Pagamenti automatici
* Scraping non conforme per TikTok/IG (MVP: seed links + YouTube-first)
* Autopost totale “a tutti i costi” (MVP: queue + 1-click publish)

---

## 16) Definition of Done (MVP)

Il progetto è “done” quando:

1. CEO Console gestisce guardrail, approvals, purchase requests, social queue, finance ledger/PnL.
2. Convex esegue daily/weekly cycles e salva audit e artifacts.
3. Kick Counter è live con Stripe e funnel tracciato.
4. Il sistema genera un batch video (script→render→queue) approvabile e pubblicabile.
5. PnL mostra incassi Stripe e spese (da purchase request + manual) e calcola burn/runway.