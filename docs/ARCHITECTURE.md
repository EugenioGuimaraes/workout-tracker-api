# Workout Tracker API — Especificação Técnica

> Documento de referência para desenvolvimento orientado por Claude Code no VSCode.
> Stack: NestJS + PostgreSQL + Prisma. Metodologia: TDD. Foco: segurança e boas práticas de API REST.

---

## 1. Visão Geral

API backend para uma aplicação de tracking de treinos. Usuários se cadastram, fazem login, criam planos de treino compostos por exercícios (com séries, repetições e carga), agendam treinos, registram execuções e geram relatórios de progresso.

### Objetivos do projeto (portfólio)
- Demonstrar domínio de NestJS + Prisma + Postgres em um cenário realista.
- Demonstrar práticas de segurança de API (auth, ownership, rate limiting, validação).
- Demonstrar TDD real (teste antes da implementação) com cobertura significativa.
- Documentação de API via OpenAPI/Swagger.

---

## 2. Stack Técnica

| Camada | Tecnologia |
|---|---|
| Framework | NestJS (TypeScript) |
| ORM | Prisma |
| Banco | PostgreSQL |
| Auth | JWT (access + refresh token) |
| Hash de senha | argon2 |
| Validação | class-validator / class-transformer |
| Testes unitários | Jest |
| Testes e2e | Jest + Supertest + Testcontainers (Postgres real) |
| Docs de API | Swagger (@nestjs/swagger) |
| Rate limiting | @nestjs/throttler |
| Segurança HTTP | Helmet, CORS explícito |

---

## 3. Arquitetura de Módulos

```
src/
  auth/
    auth.module.ts
    auth.controller.ts
    auth.service.ts
    auth.service.spec.ts
    strategies/
      jwt.strategy.ts
      jwt-refresh.strategy.ts
    guards/
      jwt-auth.guard.ts
      owner.guard.ts
    dto/
      signup.dto.ts
      login.dto.ts
      refresh.dto.ts

  users/
    users.module.ts
    users.service.ts
    users.service.spec.ts
    users.repository.ts

  exercises/
    exercises.module.ts
    exercises.controller.ts
    exercises.service.ts
    exercises.service.spec.ts
    seed/
      exercise.seeder.ts
      exercises.data.ts

  workout-plans/
    workout-plans.module.ts
    workout-plans.controller.ts
    workout-plans.service.ts
    workout-plans.service.spec.ts
    dto/
      create-workout-plan.dto.ts
      update-workout-plan.dto.ts

  workout-logs/
    workout-logs.module.ts
    workout-logs.controller.ts
    workout-logs.service.ts
    workout-logs.service.spec.ts

  reports/
    reports.module.ts
    reports.controller.ts
    reports.service.ts
    reports.service.spec.ts

  common/
    filters/
      http-exception.filter.ts
    interceptors/
      logging.interceptor.ts
    decorators/
      current-user.decorator.ts
    guards/
      owner.guard.ts

  prisma/
    prisma.module.ts
    prisma.service.ts

  main.ts
  app.module.ts

test/
  auth.e2e-spec.ts
  workout-plans.e2e-spec.ts
  reports.e2e-spec.ts

prisma/
  schema.prisma
  migrations/
  seed.ts
```

Regra de organização: controllers são finos (apenas roteamento + validação de entrada via DTO). Toda lógica de negócio fica nos services, que são as unidades testadas com TDD.

---

## 4. Schema do Banco (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String         @id @default(uuid())
  email         String         @unique
  passwordHash  String
  name          String
  createdAt     DateTime       @default(now())
  workoutPlans  WorkoutPlan[]
  refreshTokens RefreshToken[]

  @@map("users")
}

model RefreshToken {
  id        String   @id @default(uuid())
  tokenHash String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  revoked   Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([userId])
  @@map("refresh_tokens")
}

enum Category {
  CARDIO
  STRENGTH
  FLEXIBILITY
}

enum MuscleGroup {
  CHEST
  BACK
  LEGS
  SHOULDERS
  ARMS
  CORE
  FULL_BODY
}

model Exercise {
  id               String            @id @default(uuid())
  name             String
  description      String
  category         Category
  muscleGroup      MuscleGroup?
  workoutExercises WorkoutExercise[]
  createdAt        DateTime          @default(now())

  @@map("exercises")
}

enum WorkoutStatus {
  PENDING
  COMPLETED
  CANCELLED
}

model WorkoutPlan {
  id          String            @id @default(uuid())
  userId      String
  user        User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  name        String
  comments    String?
  scheduledAt DateTime?
  status      WorkoutStatus     @default(PENDING)
  exercises   WorkoutExercise[]
  logs        WorkoutLog[]
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  @@index([userId])
  @@index([userId, scheduledAt])
  @@map("workout_plans")
}

model WorkoutExercise {
  id            String      @id @default(uuid())
  workoutPlanId String
  workoutPlan   WorkoutPlan @relation(fields: [workoutPlanId], references: [id], onDelete: Cascade)
  exerciseId    String
  exercise      Exercise    @relation(fields: [exerciseId], references: [id])
  sets          Int
  reps          Int
  weightKg      Float?
  order         Int

  @@index([workoutPlanId])
  @@map("workout_exercises")
}

model WorkoutLog {
  id            String      @id @default(uuid())
  workoutPlanId String
  workoutPlan   WorkoutPlan @relation(fields: [workoutPlanId], references: [id], onDelete: Cascade)
  completedAt   DateTime
  notes         String?

  @@index([workoutPlanId])
  @@map("workout_logs")
}
```

**Decisões de modelagem:**
- `WorkoutPlan` representa o plano (o que deve ser feito); `WorkoutLog` representa a execução (o que de fato foi feito). Essa separação é o que permite gerar relatórios de progresso de forma limpa.
- `RefreshToken` armazena apenas o hash do token, nunca o valor puro, e é uma tabela própria para permitir revogação granular (logout de um device específico) e rotação.
- Índices em `userId` nas tabelas que mais sofrem filtro por dono (ownership check e listagens).

---

## 5. Autenticação e Segurança

### 5.1 Estratégia de Tokens

| Token | Duração | Armazenamento |
|---|---|---|
| Access Token | 2 horas | Apenas no client (não persiste no banco) |
| Refresh Token | 7 dias | Hash (SHA-256) persistido em `refresh_tokens`, valor puro só no client |

**Justificativa da duração do access token:** sessões de treino podem durar até 1-2h, e forçar refresh no meio de uma série de exercícios prejudica a experiência. A janela de exposição maior é mitigada por: refresh token de uso único (rotação a cada uso) e revogação imediata possível via endpoint de logout.

### 5.2 Rotação de Refresh Token (refresh token reuse detection)

A cada chamada ao endpoint `/auth/refresh`:
1. O token recebido é validado contra o hash salvo.
2. Se válido e não revogado: gera novo par (access + refresh), marca o token antigo como `revoked = true`, salva o novo hash.
3. Se o token já estiver marcado como `revoked` e for usado novamente: **revoga todos os refresh tokens daquele usuário** (indício de token roubado sendo reutilizado) e força novo login.

### 5.3 Senhas
- Hash com **argon2id** (não bcrypt — argon2 é o padrão atual recomendado).
- Senha nunca retorna em nenhuma response, nem em logs.

### 5.4 Ownership Guard
Guard customizado (`OwnerGuard`) aplicado em rotas de update/delete de `WorkoutPlan`. Antes de processar a ação, verifica no banco se `resource.userId === request.user.id`. Isso é checado **na camada de aplicação**, nunca apenas confiando que o JWT decodificado é suficiente — previne IDOR (Insecure Direct Object Reference).

### 5.5 Rate Limiting
`@nestjs/throttler` aplicado especialmente em:
- `POST /auth/login` — máximo 5 tentativas / minuto / IP.
- `POST /auth/signup` — máximo 10 / hora / IP.

### 5.6 Validação de Entrada
- `ValidationPipe` global com `whitelist: true` e `forbidNonWhitelisted: true` (rejeita qualquer campo não declarado no DTO).
- Todos os DTOs usam `class-validator` (`@IsEmail`, `@MinLength`, `@IsUUID`, etc).

### 5.7 Headers e CORS
- `helmet()` aplicado globalmente.
- CORS com origin explícita via variável de ambiente (nunca `*` em produção).

### 5.8 Tratamento de Erros
- `HttpExceptionFilter` global padroniza todas as respostas de erro (mesmo formato, sem vazar stack trace ou detalhes internos de banco).

---

## 6. Endpoints da API

### Auth
| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/auth/signup` | Não | Cria novo usuário |
| POST | `/auth/login` | Não | Retorna access + refresh token |
| POST | `/auth/refresh` | Refresh token | Rotaciona tokens |
| POST | `/auth/logout` | Access token | Revoga refresh token atual |
| POST | `/auth/logout-all` | Access token | Revoga todos os refresh tokens do usuário |

### Exercises
| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/exercises` | Sim | Lista exercícios (filtro por categoria/grupo muscular) |
| GET | `/exercises/:id` | Sim | Detalhe de um exercício |

*(Exercícios são somente leitura via API; a escrita acontece via seeder.)*

### Workout Plans
| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/workout-plans` | Sim | Cria plano com lista de exercícios |
| GET | `/workout-plans` | Sim | Lista planos do usuário logado (filtro por status, ordenado por data) |
| GET | `/workout-plans/:id` | Sim + Owner | Detalhe de um plano |
| PATCH | `/workout-plans/:id` | Sim + Owner | Atualiza plano (inclusive comentários) |
| DELETE | `/workout-plans/:id` | Sim + Owner | Remove plano |

### Workout Logs
| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/workout-plans/:id/logs` | Sim + Owner | Registra execução de um treino |
| GET | `/workout-plans/:id/logs` | Sim + Owner | Lista execuções de um plano |

### Reports
| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/reports/summary` | Sim | Totais gerais (treinos completados, frequência) |
| GET | `/reports/progress/:exerciseId` | Sim | Evolução de carga/reps ao longo do tempo para um exercício |

---

## 7. Estratégia de TDD

Ordem de trabalho por feature, sem exceção:

1. Escrever o teste do `service` (unitário, mockando `PrismaService`).
2. Rodar e confirmar que falha (`red`).
3. Implementar o mínimo necessário pra passar (`green`).
4. Refatorar mantendo os testes passando (`refactor`).
5. Só então escrever o controller e o teste e2e do endpoint.

### Unit Tests
- Ferramenta: Jest.
- `PrismaService` mockado com `jest-mock-extended`.
- Foco: regras de negócio puras. Exemplos de casos a cobrir:
  - Não permitir agendar treino com data no passado.
  - Apenas o dono pode atualizar/deletar um plano.
  - Refresh token revogado não pode ser reutilizado (e dispara revogação em cascata).
  - Senha incorreta no login não revela se o erro foi de email ou senha (mensagem genérica).
  - Cálculo de relatório de progresso agrega corretamente múltiplos logs.

### E2E Tests
- Ferramenta: Jest + Supertest.
- Banco real via Testcontainers (Postgres em container isolado por execução de suite).
- Fluxos cobertos: signup → login → criar plano → listar → atualizar → deletar; tentativa de acessar plano de outro usuário (espera 403); refresh token reuse (espera revogação em cascata).

### Meta de cobertura
- 80%+ em services.
- Controllers e guards cobertos via e2e, não precisam de unit test isolado salvo lógica não-trivial.

---

## 8. Setup de Ambiente

### Variáveis de ambiente (`.env`)
```
DATABASE_URL="postgresql://user:password@localhost:5432/workout_tracker"
JWT_ACCESS_SECRET="..."
JWT_ACCESS_EXPIRES_IN="2h"
JWT_REFRESH_SECRET="..."
JWT_REFRESH_EXPIRES_IN="7d"
CORS_ORIGIN="http://localhost:3000"
THROTTLE_TTL="60"
THROTTLE_LIMIT="10"
```

### Scripts esperados no `package.json`
```
npm run start:dev       # NestJS em watch mode
npm run test            # unit tests
npm run test:watch      # TDD loop
npm run test:e2e        # e2e com testcontainers
npm run test:cov        # cobertura
npx prisma migrate dev  # aplica migrations
npx prisma db seed      # roda o seeder de exercícios
```

---

## 9. Ordem de Implementação Sugerida (para o Claude Code seguir)

1. Setup do projeto NestJS + Prisma + Docker Compose (Postgres local).
2. Schema Prisma completo + primeira migration.
3. Módulo `prisma` (PrismaService injetável).
4. Módulo `auth`: signup → login → JWT strategy → refresh com rotação → logout. TDD em cada etapa.
5. Módulo `users` (suporte interno ao auth).
6. Seeder de `exercises` + módulo de leitura.
7. Módulo `workout-plans`: CRUD completo + ownership guard. TDD em cada etapa.
8. Módulo `workout-logs`.
9. Módulo `reports`.
10. Swagger configurado em `main.ts`, documentando todos os DTOs e respostas.
11. Suite e2e completa.
12. README final com decisões de arquitetura documentadas (boa prática para portfólio).

---

## 10. Notas para o README final do repositório

Pontos que vale destacar explicitamente no README, porque são os que mais chamam atenção de quem avalia o portfólio:
- Justificativa da duração dos tokens (2h access / 7d refresh) ligada ao caso de uso real.
- Rotação de refresh token com detecção de reuso.
- Ownership check na camada de aplicação, não só no token.
- TDD real, com prints ou menção do fluxo red-green-refactor.
- Cobertura de testes (rodar `test:cov` e citar o número).
