# AuraSync Deal Intelligence

AuraSync is a privacy-first **Deal Decay Detection MVP** for revenue leaders. The application helps executives understand portfolio health, identify deals forecast to stall within approximately 30 days, inspect the metadata evidence behind each score, and assign a recommended intervention.

> **Strict boundary:** AuraSync models communication timing, participation, cadence, and CRM context. It does not ingest or display message subjects, bodies, attachment content, meeting transcripts, recordings, or semantic summaries.

## MVP Capabilities

| Experience | Implementation |
| --- | --- |
| Executive dashboard | Value-weighted portfolio health, pipeline exposure, risk distribution, eight-week trend, and prioritized alerts |
| Deal portfolio | Search, health filters, bidirectional risk sorting, and direct navigation to deal evidence |
| Explainable deal risk | Deterministic score contributions for response latency, engagement decline, stakeholder coverage, and communication gaps |
| Thirty-day forecast | Deals at or above the high-risk threshold receive a thirty-day forecast flag and predicted stall date |
| Integrations | Gmail, Outlook, Slack, Teams, Salesforce, and HubSpot status with explicit least-privilege field contracts |
| Governance | Collected/prohibited field boundary, retention posture, participant protection, purpose limitation, and score provenance |
| Seeded workspace | Six realistic enterprise opportunities across critical, high, medium, and low relationship risk |
| Executive command | Keyboard-accessible intelligence navigation with `Ctrl/Cmd + K`, route context, and metadata-current posture |
| Signature visual system | Aura signal fields, orbital relationship geometry, provenance trails, and a disciplined cyan/purple intelligence palette |
| Easy setup import | Local-first Salesforce opportunity and Gmail activity CSV import with templates, contract previews, blocked content fields, and safe staging summaries |
| Drift check-ins | A manual-first personal mode for chosen reminders, private notes, to-dos, shared plans, browser notifications, calendar export, CSV/JSON transfer, and local data removal |

## Deal Decay Model

The score is deterministic and bounded from 0 to 100. Response latency contributes **30%**, engagement decline contributes **25%**, stakeholder coverage contributes **25%**, and communication gaps contribute **20%**. A score of 65 or above is flagged as forecast to stall within the thirty-day operating window.

The score is intended as an **operating indicator**, not an assessment of employee or customer intent. Every contribution retains its baseline, current value, source system, observation time, and plain-language provenance.

## Metadata Contract

| Collected | Explicitly excluded |
| --- | --- |
| Activity identifier and timestamp | Subject lines |
| Sender and participant identifiers | Message bodies |
| Channel, thread, and direction metadata | Attachment content |
| Meeting attendance status | Meeting transcripts and call recordings |
| CRM deal, stage, owner, amount, close date, and contact roles | Semantic summaries or content-derived sentiment |

## Architecture

The frontend uses React, TypeScript, Tailwind CSS, shadcn components, Recharts, and tRPC. The server uses Express, tRPC, Drizzle, and MySQL. Shared score and privacy contracts live in `shared/riskModel.ts`; seeded workspace data lives in `server/demoData.ts`; typed read procedures live in `server/routers/aurasync.ts`.

Drift is available at `/drift` as a separate mode in the existing web application. It stores the names, cadence selections, notes, plans, tasks, and dates the user chooses in browser local storage. It does not read the address book, messages, or OAuth data. Recurring reminders and browser notifications are opt-in; browser notifications are evaluated while the app is open. Users may also download a calendar event for a chosen date, import a CSV template or JSON backup, export data, or delete the local list. This web target is not an App Store submission, and it does not provide cross-device sync.

The database schema includes workspaces, deals, deal signals, integrations, and governance policies. The current MVP serves a read-only seeded workspace and a local-first CSV import path so stakeholders can evaluate the workflow before live provider credentials are introduced. Raw CSV files are parsed in the browser; only validation summaries are staged through tRPC.

## Validation

| Validation layer | Result |
| --- | --- |
| Vitest unit and API coverage | 26 tests passing |
| Browser interaction and accessibility QA | 26 Playwright tests passing, including Drift reminder, import, migration, and persistence flows |
| GitHub Actions CI | Pull requests run type checks, unit/API tests, production build, and Chromium-backed Playwright QA |
| TypeScript | No type errors |
| Production build | Successful |
| Responsive review | Drift reviewed at desktop and 390-pixel mobile widths |
| Runtime console and requests | No Drift browser-console errors after removing the unconfigured analytics script request |

The browser QA covers page landmarks, named controls, visible keyboard focus, representative text contrast, deal search/filter/sort, route transitions, executive command search, integration dialog behavior, visible feedback for intervention actions, CSV template download, valid Salesforce staging, blocked Gmail content columns, oversized-file handling, and Drift's local reminder/check-in, import, and migration flows.

## Run Locally

```bash
pnpm install
pnpm dev
```

Run all automated validation with:

```bash
pnpm test
pnpm exec playwright test
pnpm check
pnpm build
```

## Live Integration Path

The project intentionally does not embed third-party OAuth credentials. A production rollout can proceed through either direct vendor OAuth applications with least-privilege metadata scopes or an externally orchestrated connector workflow. Direct integration gives the application control over refresh tokens and synchronization behavior but requires one-time provider setup. Externally orchestrated access can reduce OAuth implementation work but introduces an operational dependency and recurring execution cost.

Whichever path is selected, live ingestion should preserve the types in `MetadataEvent`, reject prohibited content keys at the connector boundary, compute signals from normalized activity events, and persist only the documented metadata and score provenance.
