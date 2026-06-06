export interface HistoryLike {
  uidpeminjam?: string;
  Idbarang?: string;
  mode?: string;
  Tenggat?: string;
  extend_token?: string;
}

export interface ExtensionLike {
  uidpeminjam?: string;
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
  const normalized = String(value).trim().replace(" ", "T");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isPinjamMode(row: HistoryLike) {
  return normalizeLoanKey(row.mode) === "pinjam";
}

export function isKembaliMode(row: HistoryLike) {
  return normalizeLoanKey(row.mode) === "kembali";
}

export function sameBorrowerAndToken(a: HistoryLike, b: HistoryLike) {
  const userA = normalizeLoanKey(a.uidpeminjam);
  const userB = normalizeLoanKey(b.uidpeminjam);
  const tokenA = normalizeLoanKey(a.extend_token);
  const tokenB = normalizeLoanKey(b.extend_token);

  return Boolean(userA && tokenA && userA === userB && tokenA === tokenB);
}

export function hasMatchingReturn(loan: HistoryLike, history: HistoryLike[]) {
  return history.some((row) => isKembaliMode(row) && sameBorrowerAndToken(loan, row));
}

export function getEffectiveDeadline(loan: HistoryLike | undefined, extensions: ExtensionLike[]) {
  if (!loan) return "";

  const user = normalizeLoanKey(loan.uidpeminjam);
  const token = normalizeLoanKey(loan.extend_token);

  const related = user && token
    ? extensions.filter((row) => normalizeLoanKey(row.uidpeminjam) === user && normalizeLoanKey(row.extend_token) === token)
    : [];

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

export function isItemOverdue(item: ItemLike, history: HistoryLike[], extensions: ExtensionLike[]) {
  return getUnreturnedLoansForItem(item.uidbarang, history).some((loan) =>
    isLoanOverdue(loan, history, extensions)
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

    const aTime = aDate ? aDate.getTime() : Number.POSITIVE_INFINITY;
    const bTime = bDate ? bDate.getTime() : Number.POSITIVE_INFINITY;

    return direction === "asc" ? aTime - bTime : bTime - aTime;
  });
}
