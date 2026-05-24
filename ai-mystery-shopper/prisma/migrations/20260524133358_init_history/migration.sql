-- CreateTable
CREATE TABLE "Mission" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "targetUrl" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "rationale" TEXT,
    "persona" TEXT NOT NULL,
    "device" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "confusionScore" INTEGER,
    "priority" TEXT,
    "topDiagnosis" TEXT,
    "videoUrl" TEXT,
    "reportJson" JSONB,
    "rcaJson" JSONB,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionStep" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "missionId" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "diagnosis" TEXT,
    "severity" TEXT,
    "frustrationLevel" INTEGER,
    "verificationOutcome" TEXT,
    "verificationVerdict" TEXT,
    "currentMilestone" TEXT,
    "expectedEffect" TEXT,
    "observedEffect" TEXT,
    "thought" TEXT,
    "evidenceJson" JSONB,
    "contractId" TEXT,
    "contractVerdict" TEXT,
    "contractConfidence" DOUBLE PRECISION,
    "contractReasonsJson" JSONB,

    CONSTRAINT "MissionStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionScreenshot" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "missionId" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "message" TEXT,
    "milestone" TEXT,
    "action" TEXT,
    "diagnosis" TEXT,
    "severity" TEXT,
    "verification" TEXT,
    "verificationReasoning" TEXT,
    "pageUrl" TEXT,

    CONSTRAINT "MissionScreenshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MissionStep_missionId_stepIndex_idx" ON "MissionStep"("missionId", "stepIndex");

-- CreateIndex
CREATE INDEX "MissionScreenshot_missionId_stepIndex_idx" ON "MissionScreenshot"("missionId", "stepIndex");

-- AddForeignKey
ALTER TABLE "MissionStep" ADD CONSTRAINT "MissionStep_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionScreenshot" ADD CONSTRAINT "MissionScreenshot_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
