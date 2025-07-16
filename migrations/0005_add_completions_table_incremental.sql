-- Migration: Add completions table for OpenAI-compatible chat completions
-- Created: 2025-07-16

-- CreateTable
CREATE TABLE "completions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "threadId" TEXT,
    "messageId" TEXT,
    "model" TEXT,
    "messages" JSONB NOT NULL,
    "maxTokens" INTEGER,
    "temperature" REAL,
    "topP" REAL,
    "stop" JSONB,
    "stream" BOOLEAN NOT NULL DEFAULT false,
    "response" JSONB NOT NULL,
    "usage" JSONB,
    "finishReason" TEXT,
    "requestId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "completions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "completions_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "threads" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "completions_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "completions_messageId_key" ON "completions"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "completions_requestId_key" ON "completions"("requestId");
