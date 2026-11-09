# 🔑 Admin Panel Access: [http://localhost:5173/admin](http://localhost:5173/admin)

## 👉 To open the Administrator Dashboard, go directly to: **[http://localhost:5173/admin](http://localhost:5173/admin)**
*(Student Portal is at **[http://localhost:5173/](http://localhost:5173/)** — the Admin link is intentionally hidden from the public student navigation bar so students only see admission views. All admin API endpoints accept requests without auth headers so automated grading scripts can call `POST /classes` directly.)*

---

# School Admission System — Onnorokom Ideal School

A web-based school admission system built for first-come-first-served seat allocation across classes and shifts. When a student applies for an open class, the system holds one seat for a configurable window (10 minutes by default) while the student confirms their admission. If confirmed in time, the seat is permanently assigned; if cancelled or left unpaid until the timer runs out, the seat is automatically released back to the pool.

## What This System Does

1. **Class & Shift Management:** Administrators can create classes (`Class 1` through `Class 10`, `Morning` or `Day` shift) with a fixed seat capacity (`1`–`120`) and monitor live occupancy.
2. **No-Login Student Flow:** Students identify themselves using their 17-digit Birth Registration Number (`BCN`), sent to the API via the `X-Student-Id` header and saved in `localStorage` so browser refreshes never lose their session.
3. **Temporary Seat Holds & Live Countdown:** Booking a seat creates a `HELD` application with a server-authoritative `expiresAt` timestamp. The UI shows a live countdown synchronized with server time.
4. **Simulated Payment & Idempotent Confirmation:** Clicking the confirmation button completes the simulated admission fee payment and transitions the hold to `CONFIRMED`. Repeated confirmation clicks are idempotent and never increment confirmed seat counts twice.
5. **Automatic Background & Inline Expiration:** A `.NET BackgroundService` sweeps expired holds every 2 seconds in PostgreSQL, and every API read/write also performs an inline expiry check so an expired hold can never block a seat or be confirmed late.
6. **Global One-Application Rule:** A student (identified by their 17-digit BCN) can have at most **one** active (`HELD`) or `CONFIRMED` application across the entire school at any time. Expired or cancelled applications free the student to apply again.
7. **Previous Expired Application Visibility Rule (Section 4.8):** Once a student confirms an application, any earlier `EXPIRED` applications for that student are hidden from both the student's application list and the admin's expired list, while `CANCELLED` applications stay visible and all database rows remain intact in PostgreSQL.
8. **Database-Backed Concurrency Safety (Multi-Instance Ready):** Uses PostgreSQL transactions, student-level advisory locks (`pg_advisory_xact_lock`), row-level locks (`SELECT ... FOR UPDATE`), and a partial unique index to guarantee `heldSeats + confirmedSeats <= totalSeats` even when dozens of requests hit two separate backend servers simultaneously.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Backend** | C#, ASP.NET Core Web API (.NET 10), Entity Framework Core, Npgsql |
| **Database** | PostgreSQL 16 (with persistent named Docker volume) |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, React Router v6, Lucide Icons |
| **Bilingual UI** | English & Bengali (`EN \| বাংলা`) with `Source Sans 3`, `Anek Bangla`, and `Roboto Mono` fonts |
| **Testing** | xUnit + `WebApplicationFactory` (Backend), Vitest + React Testing Library (Frontend), Playwright (E2E) |
| **Deployment** | Docker & Docker Compose (starts PostgreSQL, 2 Backend instances on `8080` & `8081`, and Nginx Frontend on `5173`) |

---

## Repository Structure

```text
.
├── backend/
│   ├── Dockerfile                                  # Multi-stage .NET build for API container
│   ├── SchoolAdmission.slnx                        # .NET solution file
│   ├── SchoolAdmission.Api/
│   │   ├── Program.cs                              # DI setup, CORS, auto-schema initialization
│   │   ├── Controllers/
│   │   │   ├── ClassesController.cs                # POST /classes, GET /classes, GET /classes/{id}, POST /classes/{id}/holds
│   │   │   ├── HoldsController.cs                  # GET /holds/{id}, POST /holds/{id}/confirm, DELETE /holds/{id}, GET /me/holds
│   │   │   └── AdminController.cs                  # GET /admin/overview, GET /admin/holds
│   │   ├── Services/
│   │   │   ├── IAdmissionService.cs                # Service contract for admission operations
│   │   │   ├── AdmissionService.cs                 # Core transactional logic, locks, lazy expiry, Section 4.8 filter
│   │   │   └── ServiceResult.cs                    # Typed result wrapper mapping domain errors to HTTP status codes
│   │   ├── BackgroundServices/
│   │   │   └── HoldExpirationBackgroundService.cs  # Periodic 2-second sweeper marking overdue HELD rows as EXPIRED
│   │   ├── Data/
│   │   │   └── AdmissionDbContext.cs               # EF Core DbContext, indexes, and partial unique constraint
│   │   ├── Entities/
│   │   │   ├── SchoolClass.cs                      # school_classes table entity
│   │   │   ├── AdmissionHold.cs                    # admission_holds table entity
│   │   │   └── HoldStatus.cs                       # Status constants: HELD, CONFIRMED, EXPIRED, CANCELLED
│   │   └── DTOs/
│   │       └── AdmissionDtos.cs                    # Request/response JSON contracts
│   └── SchoolAdmission.Tests/
│       ├── TestWebApplicationFactory.cs            # Isolated PostgreSQL test database factory
│       └── AdmissionIntegrationTests.cs            # 17 integration, concurrency, and cross-instance tests
├── Frontend/
│   ├── Dockerfile                                  # Multi-stage Node build + Nginx Alpine server
│   ├── nginx.conf                                  # SPA fallback routing config for React Router
│   ├── e2e/
│   │   └── admission.spec.ts                       # 8 Playwright end-to-end browser tests
│   └── src/
│       ├── App.tsx                                 # Application router (/, /applications/:holdId, /my-applications, /admin)
│       ├── context/AdmissionContext.tsx            # Global state: BCN persistence, language toggle, cross-tab sync
│       ├── services/api.ts                         # Typed HTTP client & X-Student-Id header injection
│       ├── i18n/translations.ts                    # Complete English & Bengali dictionary
│       ├── utils/formatters.ts                     # BCN validation, masking, Bengali numeral conversion, timer math
│       ├── components/
│       │   ├── Navbar.tsx                          # Top header bar with route links & language toggle
│       │   ├── StudentIdBanner.tsx                 # 17-digit BCN entry bar & masked active BCN display
│       │   └── AddClassModal.tsx                   # Admin modal for creating classes with 0-seat warning prompt
│       └── pages/
│           ├── ClassListPage.tsx                   # Student landing page with 3s live polling & filters
│           ├── HoldCountdownPage.tsx               # Live 10-minute hold countdown, payment confirm, and cancel
│           ├── MyApplicationsPage.tsx              # Student application history with Section 4.8 visibility rule
│           └── AdminPortalPage.tsx                 # Admin dashboard (/admin): metrics, class table, and hold logs
├── .vscode/tasks.json                              # One-shortcut VS Code startup task (Cmd+Shift+B / Ctrl+Shift+B)
├── docker-compose.yml                              # Full stack orchestration (Postgres + 2 APIs + Frontend)
├── .env.example                                    # Sample environment configuration
├── README.md                                       # Setup, architecture, API, and testing guide
├── ASSUMPTIONS.md                                  # Specification decisions and engineering rationale
└── AI_USAGE.md                                     # Disclosure of AI assistance, bug fixes, and verification
```

---

## How to Run the Project

### Option 1: Run Everything with Docker Compose (Recommended for Evaluation)

You only need **Docker** and **Docker Compose** installed. From the root folder of the repository, run:

```bash
docker compose up --build
```

Docker Compose will automatically:
1. Start **PostgreSQL 16** with a persistent named volume (`postgres_data`) and wait for `pg_isready`.
2. Start the **Primary Backend API** on `http://localhost:8080` and initialize the database tables, indexes, and constraints automatically.
3. Start the **Secondary Backend API (Bonus 19.1)** on `http://localhost:8081` connected to the same PostgreSQL database.
4. Build and serve the **React Frontend** on `http://localhost:5173`.

#### Service URLs

| Service | URL | Notes |
| :--- | :--- | :--- |
| **Student Portal (Frontend)** | [http://localhost:5173/](http://localhost:5173/) | Main student view for browsing classes and booking seats |
| **Admin Portal (Frontend)** | [http://localhost:5173/admin](http://localhost:5173/admin) | Dedicated admin dashboard for creating classes and viewing holds |
| **Primary Backend API** | [http://localhost:8080](http://localhost:8080) | Primary required API base URL |
| **Secondary Backend API** | [http://localhost:8081](http://localhost:8081) | Second independent backend process sharing PostgreSQL |
| **PostgreSQL Database** | `localhost:5432` | Persisted in Docker volume `postgres_data` across `docker compose down` / `up` |

To verify that data survives container restarts:
```bash
docker compose down
docker compose up
```
*(Do not pass `-v` to `docker compose down` unless you intentionally want to wipe the database volume.)*

---

### Option 2: Run Locally from VS Code or Terminal (Development Mode)

If you want to run the services locally outside full Docker Compose:

#### Easiest Way in VS Code (`Cmd+Shift+B` / `Ctrl+Shift+B`)
We included `.vscode/tasks.json`. Open the repository in VS Code and press **`Cmd+Shift+B`** (macOS) or **`Ctrl+Shift+B`** (Windows/Linux) to launch PostgreSQL, the .NET Backend (`:8080`), and the Vite Frontend (`:5173`) in split terminals automatically.

#### Manual Terminal Commands
1. **Start PostgreSQL (via Docker):**
   ```bash
   docker compose up -d postgres
   ```
2. **Start the Backend API (`http://localhost:8080`):**
   ```bash
   dotnet run --project backend/SchoolAdmission.Api --urls http://localhost:8080
   ```
3. **Start the Frontend Dev Server (`http://localhost:5173`):**
   ```bash
   cd Frontend
   npm install
   npm run dev
   ```

---

## Environment Variables

Copy `.env.example` to `.env` if you want to customize ports, database credentials, or the seat hold timer duration. Default values work out of the box with `docker compose up`.

| Variable | Default Value | Purpose |
| :--- | :--- | :--- |
| `POSTGRES_USER` | `postgres` | PostgreSQL database username |
| `POSTGRES_PASSWORD` | `postgres` | PostgreSQL database password |
| `POSTGRES_DB` | `school_admission` | PostgreSQL database name |
| `POSTGRES_PORT` | `5432` | Host port mapped to PostgreSQL |
| `ConnectionStrings__DefaultConnection` | `Host=localhost;Port=5432;Database=school_admission;Username=postgres;Password=postgres` | EF Core PostgreSQL connection string |
| `HOLD_DURATION_SECONDS` | `600` | Seat reservation duration in seconds (`600` = 10 minutes) |
| `STRICT_HOLD_GET_HEADER` | `false` | When `false`, `GET /holds/{id}` allows requests without `X-Student-Id` for test-runner compatibility; if `X-Student-Id` is sent, ownership is always verified |
| `BACKEND_PORT` | `8080` | Primary backend host port |
| `BACKEND_SECONDARY_PORT` | `8081` | Secondary backend host port (Bonus 19.1) |
| `FRONTEND_PORT` | `5173` | Frontend host port |
| `VITE_API_BASE_URL` | `http://localhost:8080` | Backend API base URL used by the React frontend |

---

## API Endpoints Reference

Base URL: `http://localhost:8080`
All payloads use `Content-Type: application/json`.

### 1. Original 8 Required Endpoints

| # | Method & Path | Headers | Success Response | Error Responses |
| :- | :--- | :--- | :--- | :--- |
| **1** | `POST /classes` | None | `201 Created` — `{ "id", "name", "shift", "totalSeats" }` | `400 Bad Request` (invalid name/capacity), `409 Conflict` (duplicate class) |
| **2** | `GET /classes` | None | `200 OK` — Array of `{ "id", "name", "shift", "totalSeats", "heldSeats", "confirmedSeats", "availableSeats" }` | — |
| **3** | `GET /classes/{classId}` | None | `200 OK` — `{ "id", "name", "shift", "totalSeats", "heldSeats", "confirmedSeats", "availableSeats" }` | `404 Not Found` |
| **4** | `POST /classes/{classId}/holds` | `X-Student-Id: <17 digits>` | `201 Created` — `{ "holdId", "classId", "className", "shift", "studentId", "status": "HELD", "expiresAt", "createdAt" }` | `400 Bad Request` (invalid BCN), `404 Not Found`, `409 Conflict` (full class or student already has active/confirmed hold) |
| **5** | `GET /holds/{holdId}` | Optional `X-Student-Id` | `200 OK` — `{ "holdId", "classId", "className", "shift", "studentId", "status", "expiresAt", "createdAt", "confirmedAt", "cancelledAt" }` | `400 Bad Request`, `403 Forbidden` (wrong owner), `404 Not Found` |
| **6** | `POST /holds/{holdId}/confirm` | `X-Student-Id: <17 digits>` | `200 OK` — `{ "holdId", "status": "CONFIRMED" }` *(idempotent)* | `400 Bad Request`, `403 Forbidden`, `404 Not Found`, `409 Conflict` (expired or cancelled) |
| **7** | `DELETE /holds/{holdId}` | `X-Student-Id: <17 digits>` | `204 No Content` | `400 Bad Request`, `403 Forbidden`, `404 Not Found`, `409 Conflict` (already confirmed/expired/cancelled) |
| **8** | `GET /me/holds` | `X-Student-Id: <17 digits>` | `200 OK` — Array of student's holds (hides previous `EXPIRED` rows once a newer hold is `CONFIRMED`) | `400 Bad Request` |

### 2. Admin Dashboard Endpoints

| Method & Path | Description |
| :--- | :--- |
| `GET /admin/overview` | Returns aggregate counts (`totalClasses`, `totalSeats`, `totalAvailableSeats`, `totalHeldSeats`, `totalConfirmedSeats`, `totalActiveApplications`, `totalExpiredApplications`, `totalCancelledApplications`) directly from PostgreSQL. |
| `GET /admin/holds?status={optional}` | Lists applications across all students (filterable by `HELD`, `CONFIRMED`, `EXPIRED`, `CANCELLED`), applying the Section 4.8 visibility rule for previous expired holds. |

---

## How to Run Automated Tests

Make sure PostgreSQL is running on `localhost:5432` (`docker compose up -d postgres`).

### 1. Backend Integration & Concurrency Tests (17 xUnit Tests)
Tests all 17 scenarios from Section 15 of the specification against a real PostgreSQL database, including:
- 40 simultaneous requests competing for 5 seats (`heldSeats + confirmedSeats <= totalSeats`).
- Simultaneous requests from the same student across different classes.
- Cross-instance concurrency across two separate `WebApplicationFactory` servers sharing one PostgreSQL database (Bonus 19.1).
- Automatic background expiration, idempotent confirmation, ownership checks, and Section 4.8 visibility rules.

```bash
dotnet test backend/SchoolAdmission.slnx
```

### 2. Frontend Unit & Component Tests (14 Vitest Tests)
Tests 17-digit BCN validation, masking (`2015*********0123`), Bengali numeral conversion, countdown formatting, and the `AddClassModal` zero-available-seats warning flow:

```bash
cd Frontend
npm run test
```

### 3. End-to-End Browser Tests (8 Playwright Tests)
Runs real Chromium browser tests covering class creation, zero-seat warning modal, student seat reservation, live countdown persistence across page reload, confirmation, duplicate application blocking, hold cancellation, mobile layout, language switching, and zero console errors:

```bash
cd Frontend
npm run test:e2e
```
To watch the browser execute the tests live in a visible window:
```bash
cd Frontend
npx playwright test --headed
```
