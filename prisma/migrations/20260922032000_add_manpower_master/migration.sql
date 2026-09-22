-- Add global editable manpower calculation master.

CREATE TABLE "ManpowerMasterSetting" (
  "id" TEXT NOT NULL DEFAULT 'global',
  "rules" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ManpowerMasterSetting_pkey" PRIMARY KEY ("id")
);
