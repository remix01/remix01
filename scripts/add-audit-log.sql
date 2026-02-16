-- Migration: Add AuditLog table for escrow payment tracking
-- Description: Creates audit_log table to track all payment state changes with idempotency support

-- Create AuditLog table
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventType" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "jobId" TEXT,
    "paymentId" TEXT,
    "stripeEventId" TEXT UNIQUE,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "AuditLog_jobId_fkey" FOREIGN KEY ("jobId") 
        REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_paymentId_fkey" FOREIGN KEY ("paymentId") 
        REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS "AuditLog_jobId_createdAt_idx" ON "AuditLog"("jobId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_paymentId_createdAt_idx" ON "AuditLog"("paymentId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_eventType_idx" ON "AuditLog"("eventType");
CREATE INDEX IF NOT EXISTS "AuditLog_stripeEventId_idx" ON "AuditLog"("stripeEventId");

-- Verify table was created
SELECT 'AuditLog table created successfully' AS status;
