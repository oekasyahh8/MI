export type MatchingCategory = 'EXACT_MATCH' | 'RELATED_MATCH' | 'MANUAL_REVIEW' | 'NO_MATCH';

const degreePattern = /\b(?:D\s*[-.]?\s*(?:III|3)|DIPLOMA\s*(?:TIGA|III|3)|AHLI\s*MADYA)\b/g;

export function normalizeText(value: unknown): string | null {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  return String(value).normalize('NFKC').toUpperCase().replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').replace(/\s*\/\s*/g, ' / ').trim();
}

export function normalizeEducation(value: unknown): string | null {
  const text = normalizeText(value);
  if (!text) return null;
  return text
    .replace(degreePattern, 'D-III')
    .replace(/\bMANAJEMEN\s+INFORMATIKA\b/g, 'MANAJEMEN INFORMATIKA')
    .replace(/\s+/g, ' ')
    .trim();
}

const relatedPrograms = [
  'SISTEM INFORMASI', 'TEKNIK INFORMATIKA', 'ILMU KOMPUTER',
  'TEKNOLOGI INFORMASI', 'TEKNIK KOMPUTER', 'REKAYASA PERANGKAT LUNAK',
];

export function matchEducation(value: unknown): { category: MatchingCategory; reason: string; normalized: string | null } {
  const normalized = normalizeEducation(value);
  if (!normalized) return { category: 'MANUAL_REVIEW', reason: 'Persyaratan pendidikan belum tersedia; belum dapat diverifikasi.', normalized };

  const mentionsMi = /MANAJEMEN\s+INFORMATIKA/.test(normalized);
  const mentionsDiploma3 = /\bD-III\b/.test(normalized);
  if (mentionsMi && mentionsDiploma3) {
    return { category: 'EXACT_MATCH', reason: 'Persyaratan mencantumkan D-III Manajemen Informatika secara eksplisit.', normalized };
  }
  if (mentionsMi) {
    return { category: 'MANUAL_REVIEW', reason: 'Manajemen Informatika tercantum, tetapi jenjang D-III tidak dinyatakan dengan jelas.', normalized };
  }
  const related = relatedPrograms.find((program) => normalized.includes(program));
  if (related) {
    return { category: 'RELATED_MATCH', reason: `Persyaratan menyebut ${related}; relevan secara bidang, tetapi kesetaraannya perlu diverifikasi pada pengumuman instansi.`, normalized };
  }
  if (/\bD-III\b/.test(normalized) && /INFORMAT|KOMPUT|SISTEM|TEKNOLOGI/.test(normalized)) {
    return { category: 'MANUAL_REVIEW', reason: 'Bidang dan jenjang tampak relevan, tetapi nama program studi tidak dapat dipastikan.', normalized };
  }
  return { category: 'NO_MATCH', reason: 'Tidak ditemukan program studi Manajemen Informatika atau program terkait pada persyaratan.', normalized };
}

export function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const raw = String(value).trim().replace(/[^\d,.-]/g, '');
  if (!raw) return null;
  const lastComma = raw.lastIndexOf(',');
  const lastDot = raw.lastIndexOf('.');
  let normalized = raw;
  if (lastComma > lastDot) normalized = raw.replace(/\./g, '').replace(',', '.');
  else if (lastDot >= 0 && raw.length - lastDot - 1 === 3) normalized = raw.replace(/\./g, '');
  else normalized = raw.replace(/,/g, '');
  const result = Number(normalized);
  return Number.isFinite(result) ? result : null;
}

export function applicantPerSeat(applicants: number | null | undefined, quota: number | null | undefined): number | null {
  if (!applicants || !quota || quota <= 0) return null;
  return applicants / quota;
}

export function competitionLabel(ratio: number | null): string {
  if (ratio === null) return 'Data persaingan belum tersedia';
  if (ratio < 10) return 'Relatif Rendah';
  if (ratio <= 25) return 'Menengah';
  if (ratio <= 50) return 'Tinggi';
  return 'Sangat Tinggi';
}
