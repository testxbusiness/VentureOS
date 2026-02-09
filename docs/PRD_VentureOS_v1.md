# PRD — VentureOS

Versione: v1.0 (MVP -> v1)

Obiettivo: sistema agentico autonomo (con approvazione umana) che, data una nicchia/argomento, analizza mercato + VoC, costruisce una mappa stimoli emotivi/logici, genera idee business (affiliate, directory, micro-webapp), e in parallelo crea contenuti social per engagement e acquisizione.

## Executive Summary

VentureOS trasforma una nicchia in:
- Market intelligence
- VoC strutturata
- Trigger Map emotiva/logica
- Business concepts con scoring/risk/PnL-lite
- Social pack 30 giorni
- Roadmap 30/60/90 + backlog

Il sistema è autonomo nella produzione ma vincolato da guardrail human-in-the-loop: nessuna azione esterna o decisione finale senza approvazione.

## Obiettivi MVP

Dato input (nicchia + geo/lingua + vincoli), generare in meno di 1 ora:
- Top insight VoC + Trigger Map
- 15-30 idee business con scoring
- Top 3-5 shortlist
- Social pack 30 giorni per top idea (o 2 idee)

## KPI principali

- % run con shortlist senza intervento > 80%
- Tempo medio a Top 5 < 30-45 min
- Tasso approvazione shortlist > 50%
- Qualita percepita (0-5): chiarezza, trigger fit, fattibilita MVP, compliance, originalita

## Flusso end-to-end

Input -> Brief -> Market Signals -> VoC -> Trigger Map -> Idea Gen -> Validation/Scoring -> PnL-lite -> Risk/Compliance -> Social Pack -> Roadmap

Checkpoint obbligatori:
- Niche Brief
- Trigger Map
- Shortlist
- PnL/Risk GO-NO GO
- Social Pack finale

## Roster agenti

Core:
- A0 Orchestrator
- A1 Niche Intake
- A2 Market Signals
- A3 VoC
- A4 Emotion-Logic Synthesizer
- A5 Business Idea Generator
- A6 Validator & Scorer
- A7 PnL-lite & KPI
- A8 Risk/Compliance
- A9 Execution Planner

Social:
- S1 Platform & Audience Fit
- S2 Social Content Strategy
- S3 30-Day Calendar
- S4 Script & Copy
- S5 Creative Prompt
- S6 Social QA / Policy
- S7 Performance Analyst (v2)

## Requisiti funzionali MVP

- Input nicchia/geo/lingua/vincoli/capabilities
- Pipeline automatica con checkpoint
- Idee multi-formato + shortlist + PnL-lite + risk
- Social pack 30 giorni
- Storage + audit + versioning run
- Rubric scoring configurabile

## Requisiti non funzionali

- Tracciabilita: artefatto linkato a evidenze VoC
- Ripetibilita: run comparabili (seed/version)
- Cost control: caching/dedup
- Observability: log strutturati per step/tempo/costo

## Roadmap (alto livello)

- Fase 1: Research -> Ideas -> Approval
- Fase 2: Social Pack
- Fase 3: Iterazione con dati reali
