import { useEffect, useState } from "react";
import { api, Riwayat } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { Search, Loader2, ClipboardList, Filter, Plus, X } from "lucide-react";

const MODES = ["Pinjam", "Kembali", "Perpanjang", "Update"];

function ModeBadge({ mode }: { mode: string }) {
  const colors: Record<string, string> = {
    Pinjam: "bg-blue-100 text-blue-700",
    Kembali: "bg-green-100 text-green-700",
    Perpanjang: "bg-yellow-100 text-yellow-700",
    Update: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${colors[mode] || "bg-gray-100 text-gray-600"}`}>
      {mode}
    </span>
  );
}

const EMPTY: Riwayat = {
  uidpeminjam: "", Idbarang: "", nama: "", kelas: "",
  mode: "Pinjam", waktu: "", Perpanjang: "",
};

export default function RiwayatPage() {
  const { pin } = useAuth();
  const { showToast } = useToast();
  const [data, setData] = useState<Riwayat[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Riwayat>(EMPTY);

  const fetchData = async () => {
    setLoading(true);
    const res = await api<{ riwayat: Riwayat[] } | Riwayat[]>({ action: "getRiwayat", pin });
    setLoading(false);
    if (res.ok && res.data) {
      const d = res.data as any;
      setData(Array.isArray(d?.riwayat) ? d.riwayat : Array.isArray(d) ? d : []);
    } else {
      showToast(res.error || "Gagal memuat riwayat.", "error");
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = data.filter(r => {
    const matchSearch = !search || [r.uidpeminjam, r.Idbarang, r.nama, r.kelas]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()));
    const matchMode = !filterMode || r.mode === filterMode;
    const matchDate = !filterDate || r.waktu?.startsWith(filterDate);
    return matchSearch && matchMode && matchDate;
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await api({ action: "addRiwayat", pin, data: form });
    setSaving(false);
    if (res.ok) {
      showToast("Riwayat berhasil ditambahkan.", "success");
      setShowModal(false);
      setForm(EMPTY);
      fetchData();
    } else {
      showToast(res.error || "Gagal menyimpan riwayat.", "error");
    }
  };

  return (
    <div className="page-transition space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><ClipboardList className="w-5 h-5 text-primary" />Riwayat</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{data.length} entri riwayat</p>
        </div>
        <button onClick={() => { setForm(EMPTY); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity shadow-sm">
          <Plus className="w-4 h-4" />Tambah Riwayat
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search" placeholder="Cari nama, UID peminjam, ID barang, kelas..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <select value={filterMode} onChange={e => setFilterMode(e.target.value)}
            className="py-2 pl-3 pr-8 text-sm bg-card border border-border rounded-lg focus:outline-none focus:border-primary/50">
            <option value="">Semua Mode</option>
            {MODES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <input
            type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
            className="py-2 px-3 text-sm bg-card border border-border rounded-lg focus:outline-none focus:border-primary/50"
          />
          {filterDate && (
            <button onClick={() => setFilterDate("")} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="bg-card border border-card-border rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ClipboardList className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">Tidak ada riwayat ditemukan</p>
            <p className="text-xs mt-1">Ubah filter atau pencarian</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {["UID Peminjam","ID Barang","Nama","Kelas","Mode","Waktu","Perpanjang"].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r, i) => (
                  <tr key={i} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{r.uidpeminjam || "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{r.Idbarang || "-"}</td>
                    <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{r.nama || "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{r.kelas || "-"}</td>
                    <td className="px-4 py-3"><ModeBadge mode={r.mode} /></td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{r.waktu || "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{r.Perpanjang || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-card-border rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-base font-semibold">Tambah Riwayat</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              {([
                { field: "uidpeminjam", label: "UID Peminjam" },
                { field: "Idbarang", label: "ID Barang" },
                { field: "nama", label: "Nama" },
                { field: "kelas", label: "Kelas" },
                { field: "waktu", label: "Waktu (YYYY-MM-DD HH:mm:ss)" },
                { field: "Perpanjang", label: "Perpanjang" },
              ] as { field: keyof Riwayat; label: string }[]).map(({ field, label }) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
                  <input
                    type="text"
                    value={form[field]}
                    onChange={e => setForm({ ...form, [field]: e.target.value })}
                    required={field === "uidpeminjam" || field === "Idbarang" || field === "nama"}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Mode</label>
                <select
                  value={form.mode}
                  onChange={e => setForm({ ...form, mode: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:border-primary/50"
                >
                  {MODES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors">Batal</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}{saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
