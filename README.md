# Workout Tracker API

REST API for workout tracking built as a portfolio project. Covers authentication with refresh-token rotation, workout plan management, exercise catalog, and training history reports.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | NestJS 11 |
| ORM | Prisma 6 |
| Database | PostgreSQL 16 |
| Auth | JWT (access + refresh) + Argon2 |
| Docs | Swagger / OpenAPI |
| Tests | Jest + Testcontainers |

Security middleware: Helmet, CORS, global rate limiting (Throttler), ValidationPipe with whitelist, global exception filters.

## Modules

```
src/
├── auth/           JWT auth — signup, login, token refresh, logout
├── users/          Internal user management (used by auth)
├── exercises/      Exercise catalog with category and muscle group
├── workout-plans/  Create and manage workout plans
├── workout-logs/   Log completed workouts
├── reports/        Training history and progress reports
└── common/         Shared guards, filters, interceptors, decorators
```

## API Endpoints

### Auth (`/auth`)

| Method | Route | Auth | Rate limit | Description |
|---|---|---|---|---|
| POST | `/auth/signup` | — | 10 / hour / IP | Create account |
| POST | `/auth/login` | — | 5 / min / IP | Get token pair |
| POST | `/auth/refresh` | Refresh token | — | Rotate token pair |
| POST | `/auth/logout` | Bearer | — | Revoke current refresh token |
| POST | `/auth/logout-all` | Bearer | — | Revoke all refresh tokens |

Full interactive docs at `http://localhost:3000/api/docs`.

## Security Decisions

**Token durations — 2 h access / 7 d refresh.**
Workout sessions can last 1–2 hours; forcing a mid-session refresh would break the UX. The longer window is mitigated by single-use refresh tokens and instant revocation via logout.

**Refresh token rotation with reuse detection.**
Every call to `/auth/refresh` issues a new pair and marks the previous token as revoked. If a revoked token is presented again — a strong signal of theft — the server revokes *all* refresh tokens for that user and forces a new login.

**Refresh token stored as SHA-256 hash.**
The raw token is never persisted. The database holds `sha256(token)`, so a compromised database cannot be used to forge sessions.

**Ownership guard at the application layer.**
Protected resources are checked against `request.user.id` in a dedicated `OwnerGuard`, not just trusted from the JWT. This prevents IDOR across all write operations on user-owned resources.

**Generic error messages on login.**
Both wrong-password and unknown-email return `401 Invalid credentials`. The error message never reveals which field failed, preventing user enumeration.

## Data Models

- **User** — email + argon2id password hash
- **RefreshToken** — SHA-256 hash, per-device, revocable; cascades on user delete
- **Exercise** — name, description, `Category` (CARDIO / STRENGTH / FLEXIBILITY), `MuscleGroup`
- **WorkoutPlan** — exercises ordered with sets/reps/weight, `WorkoutStatus` (PENDING / COMPLETED / CANCELLED)
- **WorkoutLog** — completion record linked to a plan

## Getting Started

**Prerequisites:** Node.js 22+, Docker

### 1. Environment

```bash
cp .env.example .env
# Fill in JWT_ACCESS_SECRET and JWT_REFRESH_SECRET with long random strings
```

### 2. Database

```bash
docker compose up -d
```

### 3. Install & migrate

```bash
npm install
npm run prisma:migrate
npm run prisma:seed    # optional — loads exercise catalog
```

### 4. Run

```bash
# development (watch mode)
npm run start:dev

# production
npm run build && npm run start:prod
```

API: `http://localhost:3000`  
Swagger: `http://localhost:3000/api/docs`

## Tests

```bash
npm test           # unit tests (Jest)
npm run test:e2e   # e2e — spins up a real DB via Testcontainers
npm run test:cov   # coverage report
```

Unit tests follow a strict TDD cycle (red → green → refactor). Services are tested in isolation with mocked repositories; the e2e suite runs against a real PostgreSQL container so no persistence behaviour is mocked away.

**Current coverage: 20 unit tests passing across UsersService and AuthService.**

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | — |
| `JWT_ACCESS_SECRET` | Access token signing key | — |
| `JWT_ACCESS_EXPIRES_IN` | Access token TTL | `2h` |
| `JWT_REFRESH_SECRET` | Refresh token signing key | — |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL | `7d` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3000` |
| `THROTTLE_TTL` | Rate limit window (seconds) | `60` |
| `THROTTLE_LIMIT` | Max requests per window | `10` |
| `PORT` | HTTP port | `3000` |
