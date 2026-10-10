const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function utcDate(year: number, month: number, day: number): Date | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  const exact = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return exact && year >= 1900 && year <= 2200 ? date : null;
}

/** "YYYY-MM-DD" (what a date input produces) -> a date at UTC midnight, or null when it is not a real date. */
export function parseDateInput(text: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim());
  return m ? utcDate(Number(m[1]), Number(m[2]), Number(m[3])) : null;
}

/** "February 13, 2026", the format the old article files used. */
export function parseLegacyDate(text: string): Date | null {
  const m = /^([A-Za-z]+) (\d{1,2}), (\d{4})$/.exec(text.trim());
  const month = m ? MONTHS.findIndex((name) => name.toLowerCase() === m[1].toLowerCase()) : -1;
  return m && month >= 0 ? utcDate(Number(m[3]), month + 1, Number(m[2])) : null;
}

/** "February 13, 2026": how the site shows an article's date. Always UTC, so it never shifts with a timezone. */
export function formatArticleDate(date: Date): string {
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

export const toDateInput = (date: Date): string => date.toISOString().slice(0, 10);
