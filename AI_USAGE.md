# 🔑 Admin Panel Access: [http://localhost:5173/admin](http://localhost:5173/admin)

## 👉 To open the Administrator Dashboard, go directly to: **[http://localhost:5173/admin](http://localhost:5173/admin)**
*(Public student views at **[http://localhost:5173/](http://localhost:5173/)** do not show the Admin link in the navigation bar. This file documents how AI tools were used during development, what mistakes were caught during review and testing, and how those issues were fixed.)*

---

# AI Usage & Engineering Verification Log

This document explains how AI coding tools were used while building the **School Admission System**, which parts were assisted by AI, what bugs or flawed outputs came up along the way, and how we identified and fixed them.

---

## 1. AI Tools Used

- **IDE & Agentic Assistant:** Google Antigravity IDE (used for pair programming, scaffolding files, writing tests, and running terminal/browser checks).
- **Browser Automation:** Playwright & Playwright MCP for running live browser checks and inspecting DOM/console state.
- **Developer Role:** Directed the step-by-step architecture (`Step 1` through `Step 10`), defined the business constraints (such as the dedicated `/admin` route, the 17-digit BCN rules, and the zero-available-seats warning modal), reviewed diffs before every commit, and verified all test suites against a real PostgreSQL instance.

---

## 2. Parts of the Project Developed with AI Assistance

1. **Specification Review & Functional Architecture:**
   - Cross-checked the original Bengali assignment prompt with the functional requirements to make sure no endpoint paths, headers, or edge cases were missed.
2. **Backend API & PostgreSQL Concurrency Layer (`backend/`):**
   - Scaffolded the .NET 10 Web API (`SchoolAdmission.Api`), EF Core `AdmissionDbContext`, entities (`SchoolClass`, `AdmissionHold`), and DTOs.
   - Implemented `AdmissionService.cs` with PostgreSQL transactions, `pg_advisory_xact_lock(hashtext(studentId))`, `SELECT ... FOR UPDATE` row locking, inline lazy expiry, idempotent confirmation, and the Section 4.8 previous-expired visibility filter.
   - Implemented `HoldExpirationBackgroundService.cs` to sweep expired holds every 2 seconds.
3. **Frontend Application (`Frontend/`):**
   - Converted our initial HTML/CSS prototype (`PototypeHtml/index.html`) into a modular React 18 + TypeScript + Vite + Tailwind CSS application.
   - Built the bilingual (`EN | বাংলা`) dictionary (`translations.ts`), BCN persistence/masking bar (`StudentIdBanner.tsx`), 3-second polling class table (`ClassListPage.tsx`), server-synced countdown page (`HoldCountdownPage.tsx`), student history view (`MyApplicationsPage.tsx`), and admin portal (`AdminPortalPage.tsx` + `AddClassModal.tsx`).
4. **Automated Test Suites & Docker Setup:**
   - Wrote 17 backend integration and concurrency tests (`AdmissionIntegrationTests.cs`), 15 frontend Vitest tests, 8 Playwright E2E browser tests (`admission.spec.ts`), and the multi-container `docker-compose.yml` (including the dual-backend setup on ports `8080` and `8081`).

---

## 3. Key Prompts & Categories of Assistance

- **Concurrency & Locking Design:** Asked the assistant to implement PostgreSQL-level serialization so that two simultaneous requests from the same student across different classes—or 40 students competing for 5 remaining seats across two backend instances—could never bypass capacity or duplicate-application checks.
- **Prototype-to-React Conversion:** Directed the assistant to convert our static HTML design in `PototypeHtml/index.html` into a typed React + Tailwind stack while keeping the exact layout, typography (`Source Sans 3`, `Anek Bangla`, `Roboto Mono`), and bilingual switch.
- **Autonomous Bug Hunting with Playwright:** Asked the assistant to run end-to-end browser simulations across every page, inspect console logs and network payloads, and fix any UI or API bugs found.

---

## 4. Errors & Flawed Outputs Encountered (and How We Fixed Them)

AI-generated code had several real bugs during development that would have broken features if we had not tested against a real database and browser:

### Issue 1: Admin Overview Cards Showing `undefined` Seat Counts
- **What went wrong:** The backend `AdminOverviewDto` serialized JSON fields as `totalConfirmedSeats`, `totalHeldSeats`, and `totalAvailableSeats`, while the initial frontend TypeScript interface looked for `confirmedSeats`, `heldSeats`, and `availableSeats`.
- **How it was caught:** Spotted immediately when opening `http://localhost:5173/admin` during Playwright testing.
- **How we fixed it:** Aligned `AdminOverview` in `Frontend/src/types/admission.ts` and `AdminPortalPage.tsx` with the exact backend JSON property names.

### Issue 2: `AddClassModal` Not Sending `availableSeats` to the Backend
- **What went wrong:** When an admin created a class with `Available Seats = 0` and confirmed the warning dialog, `AddClassModal.tsx` only sent `{ name, totalSeats }` in the POST body and omitted `availableSeats` and `shift`. The backend then defaulted `availableSeats` to `totalSeats` instead of `0`.
- **How it was caught:** Caught by Playwright E2E `Test 6`, which created a 0-available-seat class and checked whether the student portal showed it as `Full` (`পূর্ণ`) with a disabled Apply button.
- **How we fixed it:** Updated `CreateClassRequest` and `AddClassModal.tsx` to include `shift` and `availableSeats` in the `POST /classes` request payload.

### Issue 3: `Class 1` Dropdown Filter Also Matching `Class 10`
- **What went wrong:** The initial class dropdown filter in `ClassListPage.tsx` and `AdminPortalPage.tsx` used `.includes(classFilter.toLowerCase())`. Selecting `"Class 1"` also matched `"Class 10"` because `"class 10"` starts with `"class 1"`.
- **How it was caught:** Discovered while inspecting filter behavior during the live Playwright walkthrough.
- **How we fixed it:** Replaced `.includes(...)` with a word-boundary regular expression (`new RegExp(`\\b${classFilter}\\b`, 'i')`) and added a regression assertion in Playwright `Test 8`.

### Issue 4: Shift Column Failing When `c.name` Did Not Contain the Shift Text
- **What went wrong:** The UI initially checked `c.name.includes('Morning')` to display the shift column. When a class was created directly via the API with `{ "name": "Class 6", "shift": "Day", "totalSeats": 30 }`, the shift column displayed `'-'`.
- **How it was caught:** Found while reviewing how `ClassSeatStatusDto` maps to `SchoolClassDto`.
- **How we fixed it:** Added `shift?: string` to `SchoolClassDto` and updated both tables to read `c.shift` first before falling back to `c.name`.

### Issue 5: `window.confirm` Blocking Headless Cancellation & Stale `"Expires at:"` Label on Confirmed Holds
- **What went wrong:** `HoldCountdownPage.tsx` used a native `window.confirm()` prompt before cancelling a hold, which headless Playwright browsers automatically dismiss. In addition, after a hold was `CONFIRMED` or `CANCELLED`, the fourth info card still showed the label `"Expires at:"` (`"মেয়াদ শেষ হবে:"`).
- **How it was caught:** Caught during Playwright `Test 5` (hold cancellation) and live snapshot inspection of the confirmed application screen.
- **How we fixed it:** Removed the blocking `window.confirm()`, added a fallback to `bcn || hold.studentId`, and updated the fourth info card to display `"Confirmed at:"` (`"নিশ্চিতকরণের সময়:"`) or `"Cancelled at:"` (`"বাতিলের সময়:"`) when appropriate.

### Issue 6: `DbSet<AdmissionHold>.Find` Primary Key Type Mismatch in xUnit Tests
- **What went wrong:** In `AdmissionIntegrationTests.cs`, `db.Holds.FindAsync(hold.HoldId)` threw an `ArgumentException` because `AdmissionHold.Id` in PostgreSQL is a `Guid` while the DTO's `holdId` is a `string`.
- **How it was caught:** Caught when running `dotnet test backend/SchoolAdmission.slnx`.
- **How we fixed it:** Parsed the string ID with `Guid.Parse(hold.HoldId)` before querying EF Core.

### Issue 7: Minor Bengali Typo, Missing Parenthesis, and Console Warnings
- **What went wrong:**
  1. `translations.ts` had a typo at the end of the Bengali BCN placeholder (`২০১০১২৩৪৫৬৭৮৯০১Link` instead of `২০১০১২৩৪৫৬৭৮৯০১২৩`).
  2. `ClassListPage.tsx` was missing a closing `)` on the `সম্পূর্ণ খালি (০)` pill button.
  3. `tsconfig.json` needed `@testing-library/jest-dom/vitest` in `types` so `npm run build` (`tsc && vite build`) wouldn't fail on test matchers.
  4. Browser DevTools logged a `404` for `/favicon.ico` and two React Router v7 future-flag warnings.
- **How it was caught:** Caught via `npm run build` and Playwright MCP console inspection.
- **How we fixed it:** Fixed the translation string and parenthesis, added the `jest-dom/vitest` type entry, added an inline SVG favicon in `index.html`, and enabled `v7_startTransition` and `v7_relativeSplatPath` on `<BrowserRouter>`.

---

## 5. How Correctness Was Verified

1. **Backend Concurrency & Integration Suite (`dotnet test`):** All 17 xUnit tests pass against a real PostgreSQL 16 database, including concurrent seat booking bursts, same-student parallel requests across classes, and dual-server cross-instance locking.
2. **Frontend Unit & Component Suite (`npm run test`):** All 15 Vitest tests pass with zero warnings.
3. **End-to-End Browser Suite (`npm run test:e2e`):** All 8 Playwright tests pass in Chromium, verifying the full user and admin flows, refresh persistence, mobile responsiveness, and zero console errors/warnings.
4. **Production Build (`npm run build` & `docker compose up`):** Verified clean TypeScript compilation and full multi-container startup with persistent PostgreSQL storage.
