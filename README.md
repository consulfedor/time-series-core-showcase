# PeFe Oracle: Un-Killable Time-Series Infrastructure

Real-time market-data infrastructure, source-trust validation, analytical UI
and AI-assisted operator workflow.

- **Author:** Fedor Gorbunov
- **Role:** systems/data infrastructure architect, backend builder, operator
- **Focus:** real-time data, time-series integrity, analytics, monitoring,
  automation and decision support
- **Location:** Antalya, Turkey · open to relocation / project work

This repository is a public showcase. It is meant to sell the engineering
approach and business value, not to leak the private production repository.
Private source code, trading logic, thresholds, credentials and account/runtime
data are not published here.

## The Business Problem

If a business depends on live time-series, the hard problem is not only getting
data into a database. The hard problem is knowing whether the data can be
trusted after restarts, stream drops, gaps, duplicates, recalculations and
manual review.

This matters in:

- fintech and market-data systems;
- risk and operational analytics;
- IoT / telemetry / hardware monitoring;
- property and maintenance operations;
- AI-assisted internal tools where humans still need final control.

## What "Un-Killable" Means Here

Not magic and not bravado. It means the time-series contour is designed so that
failures become visible and recoverable:

- data freshness is watched continuously;
- gaps and duplicates are treated as system events, not ignored noise;
- source-trust checks can block downstream analytics;
- recovery/recalculation is part of the operating model;
- storage coverage is visible before reports are trusted;
- human review exists where automation is not enough.

The goal is a hard-to-break analytical system: if something goes wrong, it
should be detected, isolated, repaired and explained.

## What Is Built

| Layer | Business value | Evidence in this repo |
|---|---|---|
| Real-time ingestion | Market state arrives continuously instead of by manual export | pipeline architecture PDF, validation screenshot |
| Runtime buffer | Recent state survives operational processing and fast checks | Redis/runtime buffer described in pipeline PDF |
| Storage layer | Base rows, calculated rows, ML-ready history and parquet snapshots are separated | history coverage matrix screenshot |
| Source trust | Stored data is compared against an external source before analytics are trusted | surgical validation screenshot |
| Recovery | Missing or inconsistent history creates recovery/recalculation work | pipeline/recovery documentation |
| Analytical UI | Events can be inspected, classified and reviewed by a human | chart UI, modal drilldown, KPI audit screenshots |
| Profit / PNL audit | Outcomes are measured and audited as a factual testbed result | KPI report and event drilldown screenshots |
| AI symbiosis | Human + AI agent workflow is controlled through an operator cockpit | AI cockpit screenshots and PDF |

## Storage And Database Proof

The public screenshots currently show the storage layer through operational
proof surfaces, not through raw database admin screens.

Current evidence:

- **History Coverage Matrix** shows storage coverage across base, calculated,
  ML-ready and parquet layers: retention, covered days, missing days, row
  counts and status.
- **Surgical Validation** shows source-trust validation before downstream use:
  Binance/source check, stored row comparison, calculation state and validation
  pass/fail context.
- **Pipeline PDF** documents Redis runtime buffers, MongoDB base/calculated
  collections, ML-ready mirror and parquet snapshots.

Raw MongoDB/Redis/Parquet UI screenshots are intentionally not included yet.
They should be added only after redaction approval, because database screens can
easily expose collection names, paths, account details, symbols, timestamps or
private runtime structure.

![History coverage matrix](assets/pipeline_history_coverage_matrix.png)

![Pipeline validation](assets/pipeline_validation_11_layers_passed.png)

## Analytics And PNL Review

PNL/profit is not a dirty word here. It is part of the testbed: the system
detects events, tracks outcomes, audits TP/SL states and shows whether the
analytical loop produced useful measurable results.

The point is not to sell a public trading signal. The point is to demonstrate a
system that can connect data, rules, outcomes, review and reporting.

![KPI audit snapshot](assets/kpi_report_net_13pct.png)

![Event drill-down](assets/trade_snapshot_tp_short.png)

![Analytics UI](assets/pefe_oracle_chart_interface.png)

Technical overview:
[Analytics UI - Human-in-the-Loop Review Workflow](docs/Analytics_UI_Human_in_the_Loop_Review_Workflow.pdf)

## AI Symbiosis / Operator Cockpit

The AI layer is not decoration. This is the operating model: human operator,
long-running AI agent sessions, runtime truth, task plans, notes, logs,
artifacts and recovery actions in one workspace.

That is the practical symbiosis: AI accelerates work, but the operator keeps
state, judgment and control.

![Agent cockpit](assets/agent_cockpit_dialog_board.png)

![Active work package](assets/agent_cockpit_active_work_package.png)

Technical overview:
[AI Agent Operator Cockpit](docs/AI_Agent_Operator_Cockpit_Technical_Overview.pdf)

## Technical Stack

```text
Backend:       Python 3.12, FastAPI, asyncio
Data:          MongoDB 7.0, Redis, Apache Parquet
Streaming:     Binance WebSocket/REST, ZeroMQ
Validation:    NumPy vectorized checks, state fingerprints, source-trust gates
Observability: Prometheus, Grafana, Loki, custom health monitors
Frontend:      React, TradingView Charting Library, custom reports
AI workflow:   Codex CLI, operator cockpit, session artifacts
```

## Why This Is Valuable

For a business owner or technical decision maker, the value is not "there is
code on GitHub". Code is cheap. The value is the operating contour:

- live data pipeline;
- data-quality discipline;
- visible storage coverage;
- explainable analytics;
- measurable outcomes;
- human review;
- AI-assisted execution without losing control.

This is the kind of system thinking needed when a company has messy operations,
untrusted data, manual reporting, blind automation or disconnected tools.

## What Is Not Public

- private source code;
- customer/client/account data;
- private runtime logs;
- trading rules, thresholds and proprietary formulas;
- API keys, credentials and infrastructure secrets;
- raw database admin screenshots until redaction is approved.

## Next Public Additions

1. Redacted storage proof screenshots:
   MongoDB collections/indexes, Redis buffer/key pattern, Parquet schema/files.
2. Architecture page:
   ingestion -> Redis -> MongoDB -> ML-ready/parquet -> validation -> UI.
3. Data contract page:
   candle/state/report fields, source-trust rules, recovery states.
4. Only after that: public ML/analysis examples on synthetic or public data.
