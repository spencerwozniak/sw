/** Page numbers to show: the first, the last and the neighbours of the current page, with "…" where pages are skipped. */
export function pageWindow(page: number, pageCount: number, neighbours = 2): Array<number | '…'> {
  const wanted = new Set<number>([1, pageCount]);
  for (let n = page - neighbours; n <= page + neighbours; n++) if (n >= 1 && n <= pageCount) wanted.add(n);
  const sorted = [...wanted].sort((a, b) => a - b);
  const out: Array<number | '…'> = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] === 2) out.push(n - 1); // a one-page gap is just shown
    else if (i > 0 && n - sorted[i - 1] > 2) out.push('…');
    out.push(n);
  });
  return out;
}
