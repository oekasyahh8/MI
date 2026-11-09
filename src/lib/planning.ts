import type { LocalFavorite } from '../types';

const favoritesKey = 'mi-casn-favorites-v1';
const comparisonsKey = 'mi-casn-comparison-v1';
export function getFavorites(): LocalFavorite[] {
  try { return JSON.parse(localStorage.getItem(favoritesKey) ?? '[]') as LocalFavorite[]; } catch { return []; }
}
export function saveFavorites(items: LocalFavorite[]) { localStorage.setItem(favoritesKey, JSON.stringify(items)); }
export function addFavorite(id: number) {
  const favorites = getFavorites();
  if (!favorites.some((item) => item.formationId === id)) favorites.unshift({ formationId: id, note: '', reason: '', status: 'Belum Dipelajari', createdAt: new Date().toISOString() });
  saveFavorites(favorites);
}
export function removeFavorite(id: number) { saveFavorites(getFavorites().filter((item) => item.formationId !== id)); }
export function updateFavorite(id: number, update: Partial<LocalFavorite>) { saveFavorites(getFavorites().map((item) => item.formationId === id ? { ...item, ...update } : item)); }
export function getComparison(): number[] { try { return JSON.parse(localStorage.getItem(comparisonsKey) ?? '[]') as number[]; } catch { return []; } }
export function setComparison(ids: number[]) { localStorage.setItem(comparisonsKey, JSON.stringify(ids.slice(0, 5))); }
