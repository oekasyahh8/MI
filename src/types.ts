export type MatchingCategory = 'EXACT_MATCH' | 'RELATED_MATCH' | 'MANUAL_REVIEW' | 'NO_MATCH';
export type Formation = {
  id: number; sourceId: string | null; datasetYear: number; procurementType: string | null; formationType: string | null;
  positionName: string; agencyName: string; unitWorkName: string | null; placementName: string | null; province: string | null; regency: string | null;
  educationLevel: string | null; requiredEducationRaw: string | null; requiredEducationNormalized: string | null; quota: number;
  applicantCount: number | null; applicantPerSeat: number | null; salaryMin: number | null; salaryMax: number | null;
  matchingCategory: MatchingCategory; matchingReason: string; dataSource: string | null; createdAt: string;
};
export type ApiResponse<T> = { success: boolean; data: T; meta?: { page: number; pageSize: number; total: number; pageCount: number }; error?: string };
export type Overview = {
  totalRecords: number; totalQuota: number; uniqueAgencies: number; uniquePositions: number; uniqueUnits: number; matchingRecords: number; matchingQuota: number;
  placementRegions: number; relatedRecords: number; manualReviewRecords: number;
  charts: { agencies: { name: string; quota: number; records: number }[]; positions: { name: string; quota: number; records: number }[]; regions: { name: string; quota: number; records: number }[]; procurement: { name: string; value: number }[]; education: { name: string; quota: number; records: number }[] };
};
export type LocalFavorite = { formationId: number; note: string; reason: string; status: string; createdAt: string };
