const API_URL =
  "https://script.google.com/macros/s/AKfycbwDWGybmMrZ-an8DU_1ktklelaY2dYJuJqUU96V4QGysaBusymAg3YfiFtZG9nUj34ybg/exec";

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  raw?: string;
}

export async function api<T = unknown>(payload: Record<string, unknown>): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const text = await response.text();

    try {
      const json = JSON.parse(text);
      return normalizeApiResponse(payload, json) as ApiResponse<T>;
    } catch {
      return {
        ok: false,
        error: "Response dari server bukan JSON.",
        raw: text,
      };
    }
  } catch {
    return {
      ok: false,
      error:
        "Gagal terhubung ke server Apps Script. Periksa URL API, deployment Apps Script, atau koneksi internet.",
    };
  }
}

export interface Siswa {
  nama: string;
  level: string;
  uid: string;
  Kadaluarsa: string;
  kelas: string;
}

export interface Barang {
  uidbarang: string;
  namabarang: string;
  kategori: string;
  dipinjam: string;
  lastuser: string;
  lastkelas: string;
  lastupdate: string;
  lastuid: string;
}

export interface Riwayat {
  uidpeminjam: string;
  Idbarang: string;
  nama: string;
  kelas: string;
  mode: string;
  waktu: string;
  Perpanjang: string;
}

export interface Stats {
  total_siswa?: number;
  siswa_aktif?: number;
  siswa_kadaluarsa?: number;
  total_barang?: number;
  barang_tersedia?: number;
  barang_dipinjam?: number;
  total_riwayat?: number;
  riwayat_hari_ini?: number;
  total_pinjam?: number;
  total_kembali?: number;
  total_perpanjang?: number;
  kategori_barang?: Record<string, number>;
  status_barang?: Record<string, number>;
  mode_riwayat?: Record<string, number>;
  aktivitas_7_hari?: Record<string, number>;
}

export interface BootstrapData {
  data?: Siswa[];
  siswa?: Siswa[];
  barang?: Barang[];
  riwayat?: Riwayat[];
  stats?: Stats;
  settings?: Record<string, unknown>;
}

function normalizeApiResponse(payload: Record<string, unknown>, response: unknown) {
  const res = response as ApiResponse<BootstrapData>;

  if (!res || !res.ok || !res.data) return response;

  const action = String(payload.action || "").toLowerCase();
  if (action !== "bootstrap" && action !== "getdashboard") return response;

  const boot = res.data;
  const siswa = boot.siswa ?? boot.data ?? [];
  const barang = boot.barang ?? [];
  const riwayat = boot.riwayat ?? [];

  boot.stats = buildClientStats(siswa, barang, riwayat, boot.stats);

  return res;
}

function countBy<T extends Record<string, unknown>>(rows: T[], field: keyof T): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const key = String(row[field] || "Kosong");
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function activityLast7Days(rows: Riwayat[]): Record<string, number> {
  const result: Record<string, number> = {};

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result[key] = 0;
  }

  rows.forEach((row) => {
    const key = String(row.waktu || "").slice(0, 10);
    if (Object.prototype.hasOwnProperty.call(result, key)) result[key] += 1;
  });

  return result;
}

function buildClientStats(siswa: Siswa[], barang: Barang[], riwayat: Riwayat[], serverStats?: Stats): Stats {
  const siswaKadaluarsa = siswa.filter((s) => isKadaluarsa(s.Kadaluarsa)).length;
  const barangDipinjam = barang.filter((b) => isDipinjam(b.dipinjam)).length;
  const today = new Date().toISOString().slice(0, 10);

  return {
    ...(serverStats || {}),
    total_siswa: siswa.length,
    siswa_aktif: siswa.length - siswaKadaluarsa,
    siswa_kadaluarsa: siswaKadaluarsa,
    total_barang: barang.length,
    barang_dipinjam: barangDipinjam,
    barang_tersedia: barang.length - barangDipinjam,
    total_riwayat: riwayat.length,
    riwayat_hari_ini: riwayat.filter((r) => String(r.waktu || "").startsWith(today)).length,
    total_pinjam: riwayat.filter((r) => String(r.mode || "").toLowerCase() === "pinjam").length,
    total_kembali: riwayat.filter((r) => String(r.mode || "").toLowerCase() === "kembali").length,
    total_perpanjang: riwayat.filter((r) => String(r.mode || "").toLowerCase() === "perpanjang").length,
    kategori_barang: countBy(barang, "kategori"),
    status_barang: {
      Tersedia: barang.length - barangDipinjam,
      Dipinjam: barangDipinjam,
    },
    mode_riwayat: countBy(riwayat, "mode"),
    aktivitas_7_hari: activityLast7Days(riwayat),
  };
}

export function isDipinjam(value: unknown): boolean {
  const v = String(value ?? "").toLowerCase().trim();
  return v === "true" || v === "1" || v === "ya" || v === "dipinjam";
}

/**
 * Aturan kadaluarsa:
 * - Kosong, "None", atau "-" = tidak kadaluarsa.
 * - Jika hanya angka tahun, contoh "2026", maka berlaku sampai akhir tahun 2026.
 *   Baru dianggap kadaluarsa saat sudah masuk 2027.
 * - Jika format tanggal lengkap, contoh "2026-08-10", maka berlaku sampai akhir hari itu.
 */
export function isKadaluarsa(value: unknown): boolean {
  if (value === null || value === undefined) return false;

  const raw = String(value).trim();
  if (!raw) return false;

  const lower = raw.toLowerCase();
  if (lower === "none" || lower === "null" || lower === "-" || lower === "tidak") {
    return false;
  }

  const now = new Date();

  // Tahun saja, misalnya 2026 / 2027.
  if (/^\d{4}$/.test(raw)) {
    const year = Number(raw);
    const startOfNextYear = new Date(year + 1, 0, 1, 0, 0, 0, 0);
    return now >= startOfNextYear;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return false;

  // Berlaku sampai akhir hari pada tanggal tersebut.
  date.setHours(23, 59, 59, 999);
  return now > date;
}

export function isSiswaAktif(siswa: Pick<Siswa, "Kadaluarsa">): boolean {
  return !isKadaluarsa(siswa.Kadaluarsa);
}
