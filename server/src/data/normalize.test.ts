import { describe, expect, it } from 'vitest';
import { applicantPerSeat, competitionLabel, matchEducation, normalizeEducation, parseNumber } from './normalize.js';

describe('education normalization and matching', () => {
  it.each(['D-III Manajemen Informatika', 'D3 MANAJEMEN INFORMATIKA', 'Diploma III Manajemen Informatika', 'Diploma 3 Manajemen Informatika'])('canonicalizes %s', (input) => {
    expect(normalizeEducation(input)).toBe('D-III MANAJEMEN INFORMATIKA');
  });
  it('matches only the education text, not the job title', () => {
    expect(matchEducation('D-III Manajemen Informatika').category).toBe('EXACT_MATCH');
    expect(matchEducation('D-III Sistem Informasi').category).toBe('RELATED_MATCH');
    expect(matchEducation('Manajemen Informatika').category).toBe('MANUAL_REVIEW');
    expect(matchEducation(null).category).toBe('MANUAL_REVIEW');
    expect(matchEducation('S-1 Akuntansi').category).toBe('NO_MATCH');
  });
});

describe('numeric processing', () => {
  it('reads common Indonesian and international number formats', () => {
    expect(parseNumber('Rp 3.500.000')).toBe(3_500_000);
    expect(parseNumber('1,5')).toBe(1.5);
    expect(parseNumber('1.5')).toBe(1.5);
    expect(parseNumber('')).toBeNull();
  });
  it('computes applicant per seat without inventing zero values', () => {
    expect(applicantPerSeat(120, 4)).toBe(30);
    expect(applicantPerSeat(null, 4)).toBeNull();
    expect(applicantPerSeat(2, 0)).toBeNull();
    expect(competitionLabel(7)).toBe('Relatif Rendah');
    expect(competitionLabel(18)).toBe('Menengah');
    expect(competitionLabel(40)).toBe('Tinggi');
    expect(competitionLabel(72)).toBe('Sangat Tinggi');
    expect(competitionLabel(null)).toBe('Data persaingan belum tersedia');
  });
});
