-- CreateEnum
CREATE TYPE "Category" AS ENUM ('CARDIO', 'STRENGTH', 'FLEXIBILITY');

-- CreateEnum
CREATE TYPE "MuscleGroup" AS ENUM ('CHEST', 'BACK', 'LEGS', 'SHOULDERS', 'ARMS', 'CORE', 'FULL_BODY');

-- CreateEnum
CREATE TYPE "WorkoutStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "muscleGroup" "MuscleGroup",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_plans" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "comments" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "status" "WorkoutStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_exercises" (
    "id" TEXT NOT NULL,
    "workoutPlanId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "sets" INTEGER NOT NULL,
    "reps" INTEGER NOT NULL,
    "weightKg" DOUBLE PRECISION,
    "order" INTEGER NOT NULL,

    CONSTRAINT "workout_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_logs" (
    "id" TEXT NOT NULL,
    "workoutPlanId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "workout_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "workout_plans_userId_idx" ON "workout_plans"("userId");

-- CreateIndex
CREATE INDEX "workout_plans_userId_scheduledAt_idx" ON "workout_plans"("userId", "scheduledAt");

-- CreateIndex
CREATE INDEX "workout_exercises_workoutPlanId_idx" ON "workout_exercises"("workoutPlanId");

-- CreateIndex
CREATE INDEX "workout_logs_workoutPlanId_idx" ON "workout_logs"("workoutPlanId");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_plans" ADD CONSTRAINT "workout_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_workoutPlanId_fkey" FOREIGN KEY ("workoutPlanId") REFERENCES "workout_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_workoutPlanId_fkey" FOREIGN KEY ("workoutPlanId") REFERENCES "workout_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
