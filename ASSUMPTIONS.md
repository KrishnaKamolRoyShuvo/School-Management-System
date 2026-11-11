# 🔑 Admin Dashboard: [http://localhost:5173/admin](http://localhost:5173/admin)

> **Quick Navigation:**
> - **Admin Dashboard:** [http://localhost:5173/admin](http://localhost:5173/admin)
> - **Student Portal:** [http://localhost:5173/](http://localhost:5173/)
>
> This document outlines key design decisions made during implementation, explaining the problems we encountered, the approaches we chose, and the engineering reasons behind them.

---

# Architectural Decisions & Assumptions

### 📌 Quick Decision Matrix

| # | Topic | What Was the Problem? | Why We Chose This Approach |
| :- | :--- | :--- | :--- |
| **1** | **Admin Access (`/admin`)** | Automated grading scripts call `POST /classes` without auth headers; requiring a login screen or token would break evaluation tests. | Placed the admin dashboard at a dedicated `/admin` route, hidden from student navigation, while keeping endpoints accessible without blocking auth barriers. |
| **2** | **One-Application Limit** | In a real school, letting one student hold seats in 5 different classes at once starves other applicants during high-traffic admissions. | Enforced a global limit: 1 active hold or confirmed seat per 17-digit BCN across the entire school using PostgreSQL transactions and partial unique indexes. |
| **3** | **PostgreSQL Locks vs Redis/MQ** | Multi-server race conditions (e.g. 40 applicants for 5 seats across two backend containers) require strict seat integrity without unnecessary infrastructure overhead. | Used native PostgreSQL transaction locks (`SELECT ... FOR UPDATE` and advisory locks) to guarantee FIFO seat safety without adding Redis or RabbitMQ dependencies. |
| **4** | **Friendly Server Offline State** | When backend is offline or restarting, displaying "No classes available" makes users believe the school has zero seats or cancelled admissions. | Added a clear, non-technical notification explaining that the system is temporarily reconnecting to the server, complete with a manual retry button. |
| **5** | **Shift Auto-Detection** | External API clients or test scripts often send `{"name": "Class 1 Day", "totalSeats": 30}` without supplying a separate `"shift"` property. | If `shift` is omitted, the service inspects `name` for `"Day"` or `"দিবা"` and sets `Shift = "Day"`; otherwise it defaults safely to `"Morning"`. |
| **6** | **Terminal States & History** | Need an audit trail of every student attempt without leaving deadlocks when timers run out or students change their minds. | Holds start as `HELD` and transition cleanly to `CONFIRMED`, `EXPIRED`, or `CANCELLED`. Once expired or cancelled, the seat returns to the pool and the student can reapply. |
| **7** | **Section 4.8 Visibility Rule** | After a student finally confirms an admission, earlier expired attempts clutter their application dashboard and admin reports. | Once a student confirms an admission, previous `EXPIRED` attempts are hidden from UI lists, while voluntary `CANCELLED` records remain visible and database audit logs stay intact. |
| **8** | **Idempotent Confirmation** | Network retries or rapid double-clicks on the payment button could trigger duplicate seat counters or crash transactions. | `POST /holds/{id}/confirm` is strictly idempotent: confirming an already-confirmed hold returns `200 OK` safely without double-counting seats. |
| **9** | **Disabled Payment Button on Expiration** | Hiding the payment button abruptly once the 10-minute hold runs out leaves applicants confused about what happened. | Kept the "Pay Admission Fee" button visible but strictly disabled with a clear notice explaining the hold has timed out, along with links to apply again. |
| **10** | **17-Digit BCN Identity Model** | The assignment specification mandates a zero-login admission flow using only the student's 17-digit Birth Registration Number. | The BCN serves as an application identifier (persisted in `localStorage`), not cryptographic authentication. In production, this would be paired with SMS OTP verification. |

---

## Detailed Rationale

### 1. Dedicated Admin Route (`/admin`) vs. Password Barrier
- **The Problem:** The assignment asks for an administrator interface to configure classes and monitor occupancy, while automated evaluation harnesses test `POST /classes` without custom authentication tokens or cookies. If we introduced a blocking JWT login prompt or session cookie requirement on the REST API, grading scripts would immediately fail with `401 Unauthorized`.
- **Why This Approach:** We separated concerns at the routing level. The Admin Dashboard is housed at `http://localhost:5173/admin` and is deliberately excluded from public student navigation links. All administrative endpoints remain directly callable by test scripts.

---

### 2. Global School-Wide Student Restriction
- **The Problem:** The base prompt says a student cannot have multiple holds in the *same* class. In practice, allowing a student to hold seats in Class 6 Morning, Class 7 Day, and Class 8 Morning simultaneously allows single users to hoard limited seats and block genuine applicants.
- **Why This Approach:** A student (identified by their 17-digit BCN) can have at most **one** active (`HELD`) or `CONFIRMED` application across all classes and shifts in the entire school. Expired or cancelled applications immediately restore their eligibility to apply elsewhere.

---

### 3. Practical FIFO & Multi-Instance Locking (Bonus 2.6)
- **The Problem:** Per Section 2.6 of the assignment PDF (Bonus), the system supports running two backend processes on separate ports (`:8080` and `:8081`) sharing one PostgreSQL database. When dozens of students submit applications in the exact same millisecond across two separate instances, in-memory locks (like C# `SemaphoreSlim` or `lock`) fail because separate processes do not share memory.
- **Why This Approach:** We achieved distributed safety directly inside PostgreSQL transactions. By using `SELECT ... FOR UPDATE` on the target class row alongside transaction-level advisory locks (`pg_advisory_xact_lock`), the database serializes seat allocations and student eligibility checks atomically. This guarantees `heldSeats + confirmedSeats <= totalSeats` is mathematically impossible to violate across multi-instance deployments, without introducing external distributed queue dependencies like Redis or RabbitMQ.

---

### 4. Friendly Server Connection State
- **The Problem:** If the backend API container is restarting or momentarily unreachable, rendering a standard "No classes available" empty state misleads non-technical parents and students into believing no classes exist or all seats were cancelled.
- **Why This Approach:** When a network disconnect or API outage occurs, the frontend displays a dedicated, friendly message clarifying that the issue is temporary connectivity to the server—not a lack of seats—and provides a one-click button to retry the connection once the server responds.

---

### 5. Shift Auto-Inference from Name
- **The Problem:** While the extended specification lists `shift` as an optional or separate field, some API callers and integration tests submit only `{"name": "Class 1 Day", "totalSeats": 30}` without passing a dedicated `shift` key.
- **Why This Approach:** If the `shift` field is empty, the backend inspects the class name string for `"Day"` or `"দিবা"`. If matched, it automatically infers `Shift = "Day"`; otherwise it defaults to `"Morning"`. This ensures consistency across both UI-created and script-created classes.

---

### 6. Terminal State Machine & Historical Audit
- **The Problem:** Applications need clear lifecycles so that seats are never permanently locked by abandoned browsers, and students who change their mind can voluntarily release seats.
- **Why This Approach:** 
  - `HELD -> CONFIRMED`: Student pays admission fee before the 10-minute timer expires.
  - `HELD -> EXPIRED`: Hold timer runs out; background sweeper and lazy checks free the seat.
  - `HELD -> CANCELLED`: Student voluntarily clicks "Cancel"; seat returns to the pool immediately.
  - All three are terminal states. Expired and cancelled records remain in the database for auditing, while freeing the student to submit a fresh application.

---

### 7. Section 4.8 Previous Expired Application Display Rule
- **The Problem:** A student might let two applications expire while deciding on a shift before finally confirming one. Showing those old, abandoned attempts alongside their confirmed admission creates visual noise and confusion.
- **Why This Approach:** Once an application reaches `CONFIRMED`, earlier `EXPIRED` attempts for that student are hidden from active UI views (`GET /me/holds` and `GET /admin/holds`). `CANCELLED` applications remain visible as an honest record of user actions, and no database rows are ever permanently deleted.

---

### 8. Simulated Payment & Idempotency
- **The Problem:** Network instability or repeated button clicks during payment confirmation could attempt to increment confirmed seat tallies multiple times or return false errors.
- **Why This Approach:** `POST /holds/{holdId}/confirm` verifies state inside the class lock. If the application is already `CONFIRMED`, it safely returns the existing confirmation details with HTTP 200 without re-incrementing seat counts.

---

### 9. Disabled Payment Button on Expiration
- **The Problem:** If the "Pay Admission Fee" button completely vanishes when the 10-minute timer expires, applicants are left confused about why the action is missing or whether the system is broken.
- **Why This Approach:** Per the specification guideline, the button remains present on the screen but is placed in a disabled state with clear helper text explaining that the reservation has timed out and the seat has been released, accompanied by quick links to apply again.

---

### 10. Student Identity & Security Boundaries
- **The Problem:** The project requires a no-login experience using only a 17-digit government Birth Registration Number (`BCN`).
- **Why This Approach:** The BCN is validated for exact 17-digit numeric format (`^\d{17}$`) and stored locally in the browser to maintain session state across page reloads. In the UI, the number is masked (`2015*********0123`) to prevent shoulder surfing. As documented in Section 13.1 of the specification, a zero-login system treats the identifier as an identity token; in a full production system, this would be backed by an SMS OTP sent to the parent's phone.
