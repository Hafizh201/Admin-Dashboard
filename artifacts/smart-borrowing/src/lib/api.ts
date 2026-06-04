const API_URL =
  "https://script.google.com/macros/s/AKfycbwsquXFtrhmz_vFFeTOoU6AiwIwYvmIH21hlTH6URUfZ5KNDKt897xY1b-Sm_mUU3Ou/exec";

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
      return json;
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

export function isDipinjam(value: string): boolean {
  const v = String(value).toLowerCase().trim();
  return v === "true" || v === "1" || v === "ya" || v === "dipinjam";
}
