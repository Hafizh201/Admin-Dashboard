const API_URL =
  "https://script.google.com/macros/s/AKfycbyDlUHBa-YPsv2EN3iprkSMPLdWC7o_hZ80ixXnux1huALJmeFB0a-Uxh5L-F7g7ObH/exec";

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
  kategori_barang: Record<string, number>;
  status_barang: Record<string, number>;
  mode_riwayat: Record<string, number>;
  aktivitas_7_hari: Record<string, number>;
}

export interface BootstrapData {
  data: Siswa[];
  barang: Barang[];
  riwayat: Riwayat[];
  stats: Stats;
}

export function isDipinjam(value: string): boolean {
  const v = String(value).toLowerCase().trim();
  return v === "true" || v === "1" || v === "ya" || v === "dipinjam";
}
