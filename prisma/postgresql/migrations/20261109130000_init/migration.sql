-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Dataset" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "source" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'imported',
    "recordCount" INTEGER NOT NULL DEFAULT 0,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dataset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" SERIAL NOT NULL,
    "datasetId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "source" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateCount" INTEGER NOT NULL DEFAULT 0,
    "emptyQuotaCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Formation" (
    "id" SERIAL NOT NULL,
    "sourceId" TEXT,
    "datasetYear" INTEGER NOT NULL,
    "procurementType" TEXT,
    "formationType" TEXT,
    "positionName" TEXT NOT NULL,
    "agencyName" TEXT NOT NULL,
    "unitWorkName" TEXT,
    "placementName" TEXT,
    "province" TEXT,
    "regency" TEXT,
    "educationLevel" TEXT,
    "requiredEducationRaw" TEXT,
    "requiredEducationNormalized" TEXT,
    "quota" INTEGER NOT NULL,
    "applicantCount" INTEGER,
    "applicantPerSeat" DOUBLE PRECISION,
    "salaryMin" DOUBLE PRECISION,
    "salaryMax" DOUBLE PRECISION,
    "salaryCurrency" TEXT NOT NULL DEFAULT 'IDR',
    "matchingCategory" TEXT NOT NULL,
    "matchingReason" TEXT NOT NULL,
    "dataSource" TEXT,
    "importBatchId" INTEGER NOT NULL,
    "datasetId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Formation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EducationAlias" (
    "id" SERIAL NOT NULL,
    "alias" TEXT NOT NULL,
    "canonical" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EducationAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FavoriteFormation" (
    "id" SERIAL NOT NULL,
    "profileId" TEXT NOT NULL DEFAULT 'local',
    "formationId" INTEGER NOT NULL,
    "note" TEXT,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Belum Dipelajari',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteFormation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserNote" (
    "id" SERIAL NOT NULL,
    "profileId" TEXT NOT NULL DEFAULT 'local',
    "formationId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedPlan" (
    "id" SERIAL NOT NULL,
    "profileId" TEXT NOT NULL DEFAULT 'local',
    "name" TEXT NOT NULL,
    "targetProvince" TEXT,
    "targetPosition" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Belum Dipelajari',
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedComparison" (
    "id" SERIAL NOT NULL,
    "profileId" TEXT NOT NULL DEFAULT 'local',
    "name" TEXT NOT NULL,
    "formationIds" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedComparison_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Dataset_year_idx" ON "Dataset"("year");

-- CreateIndex
CREATE INDEX "ImportBatch_datasetId_idx" ON "ImportBatch"("datasetId");

-- CreateIndex
CREATE INDEX "Formation_agencyName_idx" ON "Formation"("agencyName");

-- CreateIndex
CREATE INDEX "Formation_positionName_idx" ON "Formation"("positionName");

-- CreateIndex
CREATE INDEX "Formation_province_idx" ON "Formation"("province");

-- CreateIndex
CREATE INDEX "Formation_regency_idx" ON "Formation"("regency");

-- CreateIndex
CREATE INDEX "Formation_requiredEducationNormalized_idx" ON "Formation"("requiredEducationNormalized");

-- CreateIndex
CREATE INDEX "Formation_datasetYear_idx" ON "Formation"("datasetYear");

-- CreateIndex
CREATE INDEX "Formation_matchingCategory_idx" ON "Formation"("matchingCategory");

-- CreateIndex
CREATE INDEX "Formation_datasetId_idx" ON "Formation"("datasetId");

-- CreateIndex
CREATE UNIQUE INDEX "Formation_datasetId_sourceId_key" ON "Formation"("datasetId", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "EducationAlias_alias_key" ON "EducationAlias"("alias");

-- CreateIndex
CREATE INDEX "FavoriteFormation_profileId_idx" ON "FavoriteFormation"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteFormation_profileId_formationId_key" ON "FavoriteFormation"("profileId", "formationId");

-- CreateIndex
CREATE INDEX "UserNote_profileId_formationId_idx" ON "UserNote"("profileId", "formationId");

-- CreateIndex
CREATE INDEX "SavedPlan_profileId_idx" ON "SavedPlan"("profileId");

-- CreateIndex
CREATE INDEX "SavedComparison_profileId_idx" ON "SavedComparison"("profileId");

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Formation" ADD CONSTRAINT "Formation_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Formation" ADD CONSTRAINT "Formation_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;\n