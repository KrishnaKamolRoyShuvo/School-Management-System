# 🏫 Dedicated Admin Portal: [http://localhost:5173/admin](http://localhost:5173/admin)

> **IMPORTANT EVALUATOR NOTICE:**
> The Administrator Interface is accessible **exclusively** via the dedicated URL route above. To evaluate administrative functionality (adding classes with capacity validation, overview metrics, and full audit logs), open:
> **`http://localhost:5173/admin`** (or `#/admin` in the static prototype).
> Public student views (`http://localhost:5173/`) do not display admin links in the public navbar.
> All administrative REST endpoints (`POST /classes`, `GET /admin/overview`, `GET /admin/holds`) require **no authentication** per the evaluation committee's automated test runner specifications.

---

## 📌 System Overview

The **Onnorokom Ideal School Admission Management System** is an enterprise-grade seat booking and admission management platform designed to eliminate race conditions, double bookings, and seat oversubscription under extreme concurrent load.

### Key Capabilities
- **Strict Concurrency Safety:** Employs PostgreSQL row-level locks (`SELECT ... FOR UPDATE`) and transaction-scoped advisory locks (`pg_advisory_xact_lock`) ensuring $Held + Confirmed \le TotalSeats$ at all times.
- **Dual-Instance Architecture (Bonus 19.1):** Operates seamlessly across two separate backend instances (`http://localhost:8080` and `http://localhost:8081`) sharing a single PostgreSQL cluster with distributed transaction synchronization.
- **Dynamic 10-Minute Hold Expiration:** Background periodic sweeper running every 2 seconds plus atomic inline lazy expiry on every read/write.
- **One-Application Invariant:** Enforced via PostgreSQL partial unique index (`IX_admission_holds_student_active_unique`) and advisory locking, allowing at most one active (`HELD` or `CONFIRMED`) application per 17-digit student Birth Certificate Number.
- **Previous Expired Application Visibility Rule (Section 4.8):** Previous `EXPIRED` applications are hidden from student listings once an admission is confirmed, while `CANCELLED` applications remain visible and database audit rows are permanently retained.
- **Bilingual Interface:** Full English and Bengali (`EN | বাংলা`) toggle with authentic education board terminology (`শ্রেণি`, `প্রভাত`, `দিবা`, `হোল্ড`, `নিশ্চিত`).
- **Zero-Click Live Filters:** Instant UI filtering by Class (1–10), Shift, Seat Condition, and Search Query without page reload.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Backend API** | .NET 10 Web API, C# 13, Entity Framework Core 10, Npgsql |
| **Database** | PostgreSQL 16 (with persistent volume `school_admission_postgres_data`) |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide React |
| **Fonts** | Google Fonts (`Source Sans 3`, `Anek Bangla`, `Roboto Mono`) |
| **Automated Testing** | xUnit (.NET 10), WebApplicationFactory, Vitest, React Testing Library, Playwright |
| **DevOps / Containers** | Docker, Docker Compose, Nginx Alpine, Multi-stage builds |

---

## 🚀 Quickstart with Docker Compose

To launch the complete production stack (PostgreSQL + Primary Backend on 8080 + Secondary Backend on 8081 + React Frontend on 5173):

```bash
docker compose up --build
```

### Services & URLs

| Service | Host URL | Description |
|---|---|---|
| **Student Admission Portal** | `http://localhost:5173/` | Public student interface for browsing classes and booking seats |
| **Dedicated Admin Portal** | `http://localhost:5173/admin` | Management portal for creating classes and reviewing applications |
| **Primary Backend API** | `http://localhost:8080/` | Main .NET 10 Web API service |
| **Secondary Backend API (Bonus)** | `http://localhost:8081/` | Independent second backend instance sharing PostgreSQL |
| **PostgreSQL Database** | `localhost:5432` | Database container (`user=postgres`, `password=postgres`, `db=school_admission`) |

---

## 🧪 Running Automated Tests

### 1. Backend Integration & Concurrency Tests (xUnit)
Runs 17 comprehensive tests against a real PostgreSQL database, including 40-student concurrency bursts and dual-instance advisory locking:

```bash
dotnet test backend/SchoolAdmission.slnx
```

### 2. Frontend Unit & Component Tests (Vitest)
Runs 14 unit and component tests validating BCN validation, masking, countdown calculations, and the Zero Available Seats confirmation dialog:

```bash
cd Frontend && npm run test
```

### 3. End-to-End Browser Tests (Playwright)
Executes autonomous browser tests validating the entire user journey:

```bash
cd Frontend && npm run test:e2e
```

---

## 📡 REST API Reference

All requests and responses use `application/json`. Student endpoints require the `X-Student-Id` header with a valid 17-digit numeric string (`^\d{17}$`).

| Method | Endpoint | Description | Headers |
|---|---|---|---|
| `POST` | `/classes` | Creates a new class/shift (Capacity 1–120) | None |
| `GET` | `/classes` | Lists all classes with real-time seat counts | None |
| `GET` | `/classes/{classId}` | Retrieves seat status for a specific class | None |
| `POST` | `/classes/{classId}/holds` | Reserves a temporary 10-minute seat hold | `X-Student-Id: <17-digits>` |
| `GET` | `/holds/{holdId}` | Retrieves hold status and remaining time | `X-Student-Id` (optional) |
| `POST` | `/holds/{holdId}/confirm` | Idempotently confirms an active seat hold | `X-Student-Id: <17-digits>` |
| `DELETE` | `/holds/{holdId}` | Cancels an active seat hold immediately | `X-Student-Id: <17-digits>` |
| `GET` | `/me/holds` | Lists student applications with Section 4.8 filtering | `X-Student-Id: <17-digits>` |
| `GET` | `/admin/overview` | Aggregated system metrics (seats, holds, counts) | None |
| `GET` | `/admin/holds` | Full administrative audit trail of all applications | None |
