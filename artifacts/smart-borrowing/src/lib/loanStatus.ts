export interface HistoryLike {
  uidpeminjam?: string;
  Idbarang?: string;
  mode?: string;
  Tenggat?: string;
  extend_token?: string;
}

export interface ExtensionLike {
  uidpeminjam?: string;
  Idbarang?: string;
  extend_token?: string;
  tenggat_baru?: string;
  waktu_perpanjang?: string;
}

export interface ItemLike {
  uidbarang?: string;
}

export function normalizeLoanKey(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export function parseLoanDate(value?: string) {
  if (!value) return null;

  const raw = String(value).trim();
  if (!raw) return null;

  // ISO / Apps Script default: 2026-06-06 00:00:00 or 2026-06-06T00:00:00
  const isoLike = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (isoLike) {
    const [, y, m, d, hh = "0", mm = "0", ss = "0"] = isoLike;
    const date = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  // Google Sheet formatted value often appears as 6/6/2026 0:00:00.
  // Treat it as day/month/year for this Indonesian sheet, not US month/day/year.
  const slashLike = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (slashLike) {
    const [, d, m, y, hh = "0", mm = "0", ss = "0"] = slashLike;
    const date = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function isPinjamMode(row: HistoryLike) {
  return normalizeLoanKey(row.mode) === "pinjam";
}

export function isKembaliMode(row: HistoryLike) {
  return normalizeLoanKey(row.mode) === "kembali";
}

export function sameBorrowerTokenAndItem(a: HistoryLike, b: HistoryLike) {
  const userA = normalizeLoanKey(a.uidpeminjam);
  const userB = normalizeLoanKey(b.uidpeminjam);
  const tokenA = normalizeLoanKey(a.extend_token);
  const tokenB = normalizeLoanKey(b.extend_token);
  const itemA = normalizeLoanKey(a.Idbarang);
  const itemB = normalizeLoanKey(b.Idbarang);

  return Boolean(userA && tokenA && itemA && userA === userB && tokenA === tokenB && itemA === itemB);
}

export function sameBorrowerAndToken(a: HistoryLike, b: HistoryLike) {
  return sameBorrowerTokenAndItem(a, b);
}

export function hasMatchingReturn(loan: HistoryLike, history: HistoryLike[]) {
  return history.some((row) => isKembaliMode(row) && sameBorrowerTokenAndItem(loan, row));
}

export function getExtensionsForLoan(loan: HistoryLike | undefined, extensions: ExtensionLike[]) {
  if (!loan) return [];

  const user = normalizeLoanKey(loan.uidpeminjam);
  const token = normalizeLoanKey(loan.extend_token);
  const item = normalizeLoanKey(loan.Idbarang);

  return user && token
    ? extensions.filter((row) => {
        const sameUser = normalizeLoanKey(row.uidpeminjam) === user;
        const sameToken = normalizeLoanKey(row.extend_token) === token;
        const extItem = normalizeLoanKey(row.Idbarang);
        return sameUser && sameToken && (!extItem || !item || extItem === item);
      })
    : [];
}

export function hasExtensionForLoan(loan: HistoryLike | undefined, extensions: ExtensionLike[]) {
  return getExtensionsForLoan(loan, extensions).length > 0;
}

export function getEffectiveDeadline(loan: HistoryLike | undefined, extensions: ExtensionLike[]) {
  if (!loan) return "";

  const related = getExtensionsForLoan(loan, extensions);
  const latestExtension = related[related.length - 1];
  return latestExtension?.tenggat_baru || loan.Tenggat || "";
}

export function getUnreturnedLoansForItem(itemUid: string | undefined, history: HistoryLike[]) {
  const target = normalizeLoanKey(itemUid);
  if (!target) return [];

  return history.filter((row) =>
    isPinjamMode(row) &&
    normalizeLoanKey(row.Idbarang) === target &&
    !hasMatchingReturn(row, history)
  );
}

export function getLatestUnreturnedLoanForItem(itemUid: string | undefined, history: HistoryLike[]) {
  return [...getUnreturnedLoansForItem(itemUid, history)].reverse()[0];
}

export function isLoanOverdue(loan: HistoryLike | undefined, history: HistoryLike[], extensions: ExtensionLike[]) {
  if (!loan) return false;
  if (!isPinjamMode(loan)) return false;
  if (hasMatchingReturn(loan, history)) return false;

  const deadline = parseLoanDate(getEffectiveDeadline(loan, extensions));
  return Boolean(deadline && deadline.getTime() < Date.now());
}

export function isLoanWithoutExtension(loan: HistoryLike | undefined, history: HistoryLike[], extensions: ExtensionLike[]) {
  if (!loan) return false;
  if (!isPinjamMode(loan)) return false;
  if (hasMatchingReturn(loan, history)) return false;
  return !hasExtensionForLoan(loan, extensions);
}

export function isItemOverdue(item: ItemLike, history: HistoryLike[], extensions: ExtensionLike[]) {
  return getUnreturnedLoansForItem(item.uidbarang, history).some((loan) =>
    isLoanOverdue(loan, history, extensions)
  );
}

export function isItemWithoutExtension(item: ItemLike, history: HistoryLike[], extensions: ExtensionLike[]) {
  return getUnreturnedLoansForItem(item.uidbarang, history).some((loan) =>
    isLoanWithoutExtension(loan, history, extensions)
  );
}

export function getItemDeadline(item: ItemLike, history: HistoryLike[], extensions: ExtensionLike[]) {
  const loan = getLatestUnreturnedLoanForItem(item.uidbarang, history);
  return getEffectiveDeadline(loan, extensions);
}

export function sortItemsByDeadline<T extends ItemLike>(items: T[], history: HistoryLike[], extensions: ExtensionLike[], direction: "asc" | "desc") {
  return [...items].sort((a, b) => {
    const aDate = parseLoanDate(getItemDeadline(a, history, extensions));
    const bDate = parseLoanDate(getItemDeadline(b, history, extensions));

    const emptyTime = direction === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
    const aTime = aDate ? aDate.getTime() : emptyTime;
    const bTime = bDate ? bDate.getTime() : emptyTime;

    return direction === "asc" ? aTime - bTime : bTime - aTime;
  });
}
