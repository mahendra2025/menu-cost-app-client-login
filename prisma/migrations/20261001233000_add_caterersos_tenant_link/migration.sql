ALTER TABLE "Tenant"
ADD COLUMN "caterersOsWorkspaceId" TEXT,
ADD COLUMN "caterersOsSyncEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "caterersOsLinkedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Tenant_caterersOsWorkspaceId_key"
ON "Tenant"("caterersOsWorkspaceId");
