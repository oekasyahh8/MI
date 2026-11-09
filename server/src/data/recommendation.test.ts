import { describe, expect, it } from 'vitest';
import { scoreRecommendation } from './recommendation.js';

describe('transparent recommendation scoring', () => {
  it('rewards exact education and keeps the result within 0–100', () => {
    const score = scoreRecommendation({ matchingCategory: 'EXACT_MATCH', quota: 10, applicantPerSeat: 5, salaryMax: 8_000_000, province: 'JAWA BARAT' }, { education: 40, quota: 20, competition: 20, salary: 10, location: 10 }, 10, 8_000_000, 'Jawa Barat');
    expect(score.score).toBe(99);
    expect(score.priority).toBe('Prioritas Analisis Tinggi');
    expect(score.scoreLabel).toBe('Skor Prioritas Analisis Historis');
  });
  it('normalizes arbitrary weight totals and uses a distinct low-priority label', () => {
    const score = scoreRecommendation({ matchingCategory: 'NO_MATCH', quota: 1, applicantPerSeat: 90, salaryMax: null, province: null }, { education: 0, quota: 1, competition: 1, salary: 0, location: 0 }, 100, 10_000_000);
    expect(score.score).toBeGreaterThanOrEqual(0);
    expect(score.score).toBeLessThanOrEqual(100);
    expect(score.priority).toBe('Prioritas Analisis Rendah');
  });
});
