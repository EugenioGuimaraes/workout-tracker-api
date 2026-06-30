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
├── auth/           JWT auth — register, login, token refresh, logout
├── users/          User profile management
├── exercises/      Exercise catalog with category and muscle group
├── workout-plans/  Create and manage workout plans
├── workout-logs/   Log completed workouts
├── reports/        Training history and progress reports
└── common/         Shared guards, filters, interceptors, decorators
```

## Data Models

- **User** — email + argon2 password hash
- **RefreshToken** — hashed, revocable, per-user
- **Exercise** — name, description, `Category` (CARDIO / STRENGTH / FLEXIBILITY), `MuscleGroup`
- **WorkoutPlan** — exercises ordered with sets/reps/weight, `WorkoutStatus` (PENDING / COMPLETED / CANCELLED)
- **WorkoutLog** — completion record linked to a plan

## Getting Started

**Prerequisites:** Node.js 22+, Docker

### 1. Environment

```bash
cp .env.example .env
# Edit .env with your secrets
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
# development
npm run start:dev

# production
npm run build && npm run start:prod
```

API available at `http://localhost:3000`
Swagger docs at `http://localhost:3000/api/docs`

## Tests

```bash
# unit tests
npm test

# e2e (spins up a real DB via Testcontainers)
npm run test:e2e

# coverage
npm run test:cov
```

The test suite uses **real database containers** via `@testcontainers/postgresql` — no mocks at the persistence layer.

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
