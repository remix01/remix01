-- Create Vloga enum
CREATE TYPE "Vloga" AS ENUM ('SUPER_ADMIN', 'MODERATOR', 'OPERATER');

-- Create Zaposleni table
CREATE TABLE "Zaposleni" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "ime" TEXT NOT NULL,
  "priimek" TEXT NOT NULL,
  "vloga" "Vloga" NOT NULL DEFAULT 'OPERATER',
  "aktiven" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" TEXT NOT NULL
);

-- Create indexes
CREATE INDEX "Zaposleni_vloga_idx" ON "Zaposleni"("vloga");
CREATE INDEX "Zaposleni_aktiven_idx" ON "Zaposleni"("aktiven");
CREATE INDEX "Zaposleni_createdAt_idx" ON "Zaposleni"("createdAt");
