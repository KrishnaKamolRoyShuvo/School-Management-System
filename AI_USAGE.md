# AI Usage & Pair Programming Disclosure

This document provides transparent disclosure of how AI tools and agentic coding workflows were utilized in the design, implementation, and verification of the **Onnorokom Ideal School Admission Management System**.

---

## 1. AI Tools Utilized
- **AI Coding Assistant:** Google Antigravity (Powered by DeepMind Advanced Agentic Coding).
- **Subagents & Tooling:** Automated terminal execution, filesystem editing, and Playwright MCP browser automation.
- **Human Role:** System architect, product owner, requirement clarifier, and code reviewer directing sequential roadmap progression.

---

## 2. Collaborative Workflow & Scope of AI Assistance

### 2.1 Specification Analysis & Ambiguity Resolution
- Reconciled discrepancies between the Original Bengali Assignment PDF (Onnorokom Projukti Limited) and the comprehensive 45-page Functional Specification.
- Established concrete resolutions for dedicated `/admin` routing, 17-digit student identification (`BCN`), and Section 4.8 previous expired hold visibility rules.

### 2.2 Architecture & Backend Implementation (.NET 10)
- Designed the PostgreSQL schema with Entity Framework Core 10, partial unique indexes (`ix_admission_holds_student_active`), and table check constraints.
- Implemented the distributed concurrency control model in `AdmissionService.cs` using PostgreSQL transaction-scoped advisory locks (`pg_advisory_xact_lock`) and row-level locks (`SELECT ... FOR UPDATE`).
- Built the periodic background expiration sweeper (`HoldExpirationBackgroundService.cs`) and RESTful API controllers.

### 2.3 Frontend Implementation (React 18 + TypeScript + Vite + Tailwind CSS)
- Converted the static HTML prototype into a modular, production-ready React 18 single-page application.
- Implemented the bilingual English and Bengali (`EN | বাংলা`) translation system with authentic educational terminology.
- Integrated `localStorage` student BCN persistence, real-time 3-second live polling, and server-synchronized countdown timers.

### 2.4 Test Suite Generation & Autonomous Verification
- Designed and authored 17 integration and concurrency tests in xUnit (`AdmissionIntegrationTests.cs`) executing against real PostgreSQL containers (including 40-request concurrency bursts and cross-instance dual backend verification).
- Authored 14 frontend unit and component tests using Vitest and React Testing Library (`formatters.test.ts`, `StudentIdBanner.test.tsx`, `AddClassModal.test.tsx`).
- Created and executed automated Playwright end-to-end tests (`admission.spec.ts`) validating end-to-end booking, confirmation, zero-seat warnings, and duplicate application blocking.

---

## 3. Human Review & Quality Assurance
- Every architectural decision was reviewed and explicitly approved by the project owner prior to code execution.
- Automated tests (xUnit, Vitest, and Playwright) were executed and validated in real runtime environments, ensuring zero regressions, strict type-safety, and 100% adherence to all project requirements.
