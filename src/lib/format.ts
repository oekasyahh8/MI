export const numberId = new Intl.NumberFormat('id-ID');
export const currencyId = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
export const shortCurrency = (value: number | null | undefined) => value === null || value === undefined ? 'Tidak tersedia' : currencyId.format(value);
export const countLabel = (value: number | null | undefined) => value === null || value === undefined ? 'Tidak tersedia' : numberId.format(value);
export const dateTimeId = (value: string | Date) => new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
export const ratioLabel = (value: number | null | undefined) => value === null || value === undefined ? 'Belum tersedia' : `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(value)} : 1`;

export function displayText(value: string | number | null | undefined) { return value === null || value === undefined || value === '' ? 'Tidak tersedia' : String(value); }
