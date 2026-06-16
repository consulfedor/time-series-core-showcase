# 🦅 PeFe Oracle: Autonomous Time-Series Infrastructure & AI Symbiosis

**Status:** Production-Ready Core  
**Architecture:** Zero-Gap Streaming · Vectorized Validation · Deep Human-AI Symbiosis  
**Author:** Fedor Gorbunov — Systems Infrastructure Architect, Antalya, Turkey

---

## Executive Summary

Everything in life and business is a time-series. Whether it's market volatility, industrial hardware telemetry, or supply chain cycles — all observable reality can be predictively analyzed.

Over the last 2 years, I have solo-architected an **un-killable, 24/7 real-time market data infrastructure** and analytical pipeline. This is not a prototype; it is a battle-tested engine built for scale.

---

## 1. The Core Engine — Real-Time Data Pipeline

A continuous minute-level data pipeline with strict source-trust guards, anti-duplicate safeguards, and automated historical gap recovery.

| Component | Detail |
|---|---|
| **Ingestion** | WebSocket streaming → runtime Redis ZSET buffers |
| **Persistence** | MongoDB 7.0 state + ML-ready Parquet snapshots |
| **Validation** | NumPy SIMD vectorization — 10 layers of real-time checks |
| **Performance** | ~365 µs per data slice (Python loop compressed) |
| **Reliability** | Source-trust oracle · automated gap recovery · fail-closed startup gates |

**Zero-Gap Pipeline:** If stored base candles fail the oracle check, downstream processing is blocked and recovery/recalculation starts automatically. No silent corruption.

📄 **[Read Technical Overview (PDF)](docs/Real-Time_Data_Pipeline_Source_Trust_and_Recovery_Overview.pdf)**

**Surgical Validation — all 11 layers passed:**

![Pipeline Surgical Validation — all 11 layers passed @ 2026-05-12](assets/pipeline_validation_11_layers_passed.png)

**History Coverage Matrix — zero gaps across all storage layers:**

![Pipeline History Coverage Matrix — BASE/SCW/ML-ready/Parquet all OK](assets/pipeline_history_coverage_matrix.png)

---

## 2. Analytics UI & Proof of Work

A comprehensive Human-in-the-Loop workflow surface designed for deep analytical review, order auditing, and KPI tracking.

My current base strategies show forward-tested PNLs ranging from **+11% to +32%** purely based on structural validation — no discretionary guesswork.

**KPI Report — net +13.00% · TP 52 / SL 26 · 408 orders audited:**

![KPI Report — net +13% across 408 audited orders](assets/kpi_report_net_13pct.png)

**Trade Snapshot Drill-Down — TP · SHORT · Resistance 3d · PNL +0.50%:**

![Trade Snapshot — TP SHORT Resistance 3d with full chart context](assets/trade_snapshot_tp_short.png)

**PeFe Oracle Chart Interface — TradingView-grade with custom analytical layers:**

![PeFe Oracle Chart Interface — multi-timeframe with zone/trigger overlays](assets/pefe_oracle_chart_interface.png)

📄 **[Read Analytics UI Architecture (PDF)](docs/Analytics_UI_Human_in_the_Loop_Review_Workflow.pdf)**

---

## 3. AI Agent Operator Cockpit

Built to orchestrate long-running autonomous developer agent sessions, maximizing LLM code generation efficiency without losing context or runtime truth.

- **Human-AI Symbiosis:** Dialog-first control model — the operator sees what the agent is doing, where prompts are going, which session is active, what needs attention, and which artifacts were produced.
- **Fail-Closed Status Model:** UI state reflects absolute runtime truth, resilient to network disconnects and agent restarts.
- **Session-Bound Artifacts:** Plans, notes, docs, board snapshots, and logs stay connected to the live execution context.
- **Runtime Registry:** Live/dead session tracking, bound terminals, and one-click recovery actions.

**Cockpit — Dialog control surface with live architectural Session Board:**

![Agent Cockpit — Dialog-first control surface with embedded Session Board diagram](assets/agent_cockpit_dialog_board.png)

**Active Work Package — Codex CLI session with plan-driven execution:**

![Agent Cockpit — CodexCLI Active Work Package with real-time task tracking](assets/agent_cockpit_active_work_package.png)

📄 **[Read Cockpit Architecture (PDF)](docs/AI_Agent_Operator_Cockpit_Technical_Overview.pdf)**

---

## 4. Business Application

The core mathematical engine is highly adaptable and ready for commercial deployment across 3 verticals:

1. **B2B Fintech / Quant Funds** — Eliminating data corruption that causes quantitative models to fail silently.
2. **AI-Native DevTools** — Enterprise-grade management of autonomous agent orchestration at scale.
3. **Industrial IoT** — High-frequency hardware telemetry (thermal gradients, power grids) for real-time anomaly detection.

---

## Tech Stack

```
Runtime:       Python 3.12 · FastAPI · asyncio
Data Layer:    MongoDB 7.0 · Redis (ZSET buffers) · Apache Parquet
Streaming:     Binance WebSocket/REST · ZeroMQ
Validation:    NumPy (SIMD vectorized) · custom 65-dim State Fingerprints
Observability: Prometheus · Grafana · Loki · custom Health Monitor SCW
Frontend:      React · TradingView Charting Library · custom report engine
Agent Layer:   Codex CLI · custom OZ session orchestration
```

---

## Author

**Fedor Gorbunov**  
Systems Infrastructure Architect · Founding CTO candidate  
Location: Antalya, Turkey · Open to relocation  

> *"I specialize in making data infrastructure unbreakable — streams that survive outages, validation that catches corruption before it propagates, and analytics surfaces that make complex signals explainable."*

---

*This repository is a public portfolio showcase. Proprietary strategy logic, trading thresholds, API credentials, and private runtime internals are not disclosed.*
