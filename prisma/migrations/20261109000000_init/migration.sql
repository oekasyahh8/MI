CREATE TABLE "Dataset" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "source" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'imported',
    "recordCount" INTEGER NOT NULL DEFAULT 0,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "ImportBatch" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "datasetId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "source" TEXT,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateCount" INTEGER NOT NULL DEFAULT 0,
    "emptyQuotaCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    CONSTRAINT "ImportBatch_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "Formation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
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
    "applicantPerSeat" REAL,
    "salaryMin" REAL,
    "salaryMax" REAL,
    "salaryCurrency" TEXT NOT NULL DEFAULT 'IDR',
    "matchingCategory" TEXT NOT NULL,
    "matchingReason" TEXT NOT NULL,
    "dataSource" TEXT,
    "importBatchId" INTEGER NOT NULL,
    "datasetId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Formation_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Formation_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "EducationAlias" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "alias" TEXT NOT NULL,
    "canonical" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "FavoriteFormation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profileId" TEXT NOT NULL DEFAULT 'local',
    "formationId" INTEGER NOT NULL,
    "note" TEXT,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Belum Dipelajari',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "UserNote" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profileId" TEXT NOT NULL DEFAULT 'local',
    "formationId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE TABLE "SavedPlan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profileId" TEXT NOT NULL DEFAULT 'local',
    "name" TEXT NOT NULL,
    "targetProvince" TEXT,
    "targetPosition" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Belum Dipelajari',
    "note" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "SavedComparison" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profileId" TEXT NOT NULL DEFAULT 'local',
    "name" TEXT NOT NULL,
    "formationIds" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "EducationAlias_alias_key" ON "EducationAlias"("alias");
CREATE UNIQUE INDEX "FavoriteFormation_profileId_formationId_key" ON "FavoriteFormation"("profileId", "formationId");
CREATE INDEX "Dataset_year_idx" ON "Dataset"("year");
CREATE INDEX "ImportBatch_datasetId_idx" ON "ImportBatch"("datasetId");
CREATE INDEX "Formation_agencyName_idx" ON "Formation"("agencyName");
CREATE INDEX "Formation_positionName_idx" ON "Formation"("positionName");
CREATE INDEX "Formation_province_idx" ON "Formation"("province");
CREATE INDEX "Formation_regency_idx" ON "Formation"("regency");
CREATE INDEX "Formation_requiredEducationNormalized_idx" ON "Formation"("requiredEducationNormalized");
CREATE INDEX "Formation_datasetYear_idx" ON "Formation"("datasetYear");
CREATE INDEX "Formation_matchingCategory_idx" ON "Formation"("matchingCategory");
CREATE INDEX "Formation_datasetId_idx" ON "Formation"("datasetId");
CREATE INDEX "FavoriteFormation_profileId_idx" ON "FavoriteFormation"("profileId");
CREATE INDEX "UserNote_profileId_formationId_idx" ON "UserNote"("profileId", "formationId");
CREATE INDEX "SavedPlan_profileId_idx" ON "SavedPlan"("profileId");
CREATE INDEX "SavedComparison_profileId_idx" ON "SavedComparison"("profileId");
