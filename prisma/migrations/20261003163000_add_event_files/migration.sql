CREATE TABLE "TenantEventFile" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "costingId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Enquiry',
  "phone" TEXT NOT NULL DEFAULT '',
  "email" TEXT NOT NULL DEFAULT '',
  "notes" TEXT NOT NULL DEFAULT '',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TenantEventFile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TenantEventFile_tenantId_costingId_key" ON "TenantEventFile"("tenantId", "costingId");
CREATE TABLE "EventAttachment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "eventFileId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "data" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventAttachment_eventFileId_fkey" FOREIGN KEY ("eventFileId") REFERENCES "TenantEventFile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "EventAttachment_eventFileId_idx" ON "EventAttachment"("eventFileId");
