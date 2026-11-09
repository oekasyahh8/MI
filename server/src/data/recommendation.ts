import type { MatchingCategory } from './normalize.js';

export type RecommendationWeights = { education: number; quota: number; competition: number; salary: number; location: number };
export type RecommendationSignals = { matchingCategory: MatchingCategory | string; quota: number; applicantPerSeat: number | null; salaryMax: number | null; province: string | null };

export function scoreRecommendation(item: RecommendationSignals, weights: RecommendationWeights, maxQuota: number, maxSalary: number, targetProvince?: string) {
  const education = item.matchingCategory === 'EXACT_MATCH' ? 100 : item.matchingCategory === 'RELATED_MATCH' ? 55 : item.matchingCategory === 'MANUAL_REVIEW' ? 25 : 0;
  const quota = item.quota / Math.max(1, maxQuota) * 100;
  const competition = item.applicantPerSeat === null ? 25 : Math.max(0, 100 - Math.min(item.applicantPerSeat, 100));
  const salary = (item.salaryMax ?? 0) / Math.max(1, maxSalary) * 100;
  const location = targetProvince ? (item.province?.toUpperCase().includes(targetProvince.toUpperCase()) ? 100 : 0) : (item.province ? 55 : 20);
  const weightTotal = Object.values(weights).reduce((sum, value) => sum + value, 0) || 1;
  const score = Math.round((education * weights.education + quota * weights.quota + competition * weights.competition + salary * weights.salary + location * weights.location) / weightTotal);
  return {
    score,
    scoreBreakdown: {
      education: { value: education, weight: weights.education },
      quota: { value: quota, weight: weights.quota },
      competition: { value: competition, weight: weights.competition },
      salary: { value: salary, weight: weights.salary },
      location: { value: location, weight: weights.location },
    },
    priority: score >= 70 ? 'Prioritas Analisis Tinggi' : score >= 45 ? 'Prioritas Analisis Menengah' : 'Prioritas Analisis Rendah',
    scoreLabel: 'Skor Prioritas Analisis Historis',
  };
}
