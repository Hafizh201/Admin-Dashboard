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

function buildSafeDate(year: number, month: number, day: number, hour = 0, minute = 0, second = 0) {
  const date = new Date(year, month - 1, day, hour, minute, second);
  if (Number.isNaN(date.getTime())) return null;

  // Guard supaya tanggal invalid seperti 31/02/2026 tidak otomatis digeser JS ke bulan berikutnya.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute ||
    date.getSeconds() !== second
  ) {
    return null;
  }

  return date;
}

export function parseLoanDate(value?: string) {
  if (!value) return null;

  const raw = String(value).trim();
  if (!raw) return null;

  const isoLike = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (isoLike) {
    const [, y, m, d, hh = "0", mm = "0", ss = "0"] = isoLike;
    return buildSafeDate(Number(y), Number(m), Number(d), Number(hh), Number(mm), Number(ss));
  }

  const slashLike = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (slashLike) {
    const [, first, second, year, hh = "0", mm = "0", ss = "0"] = slashLike;
    const a = Number(first);
    const b = Number(second);
    const y = Number(year);
    const hour = Number(hh);
    const minute = Number(mm);
    const secondValue = Number(ss);

    // Google Sheets/App Script sering mengirim FORMATTED_VALUE seperti M/D/YYYY.
    // Contoh: 6/7/2026 berarti 7 Juni 2026, bukan 6 Juli 2026.
    // Namun kalau angka pertama > 12, formatnya pasti D/M/YYYY, jadi tetap didukung.
    if (a > 12 && b <= 12) {
      return buildSafeDate(y, b, a, hour, minute, secondValue);
    }

    if (b > 12 && a <= 12) {
      return buildSafeDate(y, a, b, hour, minute, secondValue);
    }

    // Untuk kasus ambigu seperti 6/7/2026, prioritaskan M/D/YYYY sesuai output Google Sheets.
    return buildSafeDate(y, a, b, hour, minute, secondValue);
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
  if (hasExtensionForLoan(loan, extensions)) return false;

  // Penting: belum perpanjang baru dianggap perlu ditandai kalau tenggatnya sudah lewat.
  // Jadi data PINJAM yang tenggatnya masih lama tidak ikut merah.
  const deadline = parseLoanDate(loan.Tenggat || getEffectiveDeadline(loan, extensions));
  return Boolean(deadline && deadline.getTime() < Date.now());
}

export function isLoanNeedsAttention(loan: HistoryLike | undefined, history: HistoryLike[], extensions: ExtensionLike[]) {
  return isLoanOverdue(loan, history, extensions) || isLoanWithoutExtension(loan, history, extensions);
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

export function isItemNeedsAttention(item: ItemLike, history: HistoryLike[], extensions: ExtensionLike[]) {
  return isItemOverdue(item, history, extensions) || isItemWithoutExtension(item, history, extensions);
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
