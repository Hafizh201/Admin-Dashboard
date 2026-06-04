import { useEffect, useState } from "react";
import { api, Barang, isDipinjam } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { Plus, Search, Edit2, Loader2, Package, X, Filter } from "lucide-react";

const EMPTY: Barang = {
  uidbarang: "", namabarang: "", kategori: "", dipinjam: "false",
  lastuser: "", lastkelas: "", lastupdate: "", lastuid: "",
};

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${color}`}>{children}</span>;
}

function StatusBadge({ value }: { value: string }) {
  const borrowed = isDipinjam(value);
  return (
    <Badge color={borrowed ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}>
      {borrowed ? "Dipinjam" : "Tersedia"}
    </Badge>
  );
}

export default function BarangPage() {
  const { pin } = useAuth();
  const { showToast } = useToast();
  const [data, setData] = useState<Barang[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterKategori, setFilterKategori] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editUid, setEditUid] = useState<string | null>(null);
  const [form, setForm] = useState<Barang>(EMPTY);

  const fetchData = async () => {
    setLoading(true);
    const res = await api<{ barang: Barang[] } | Barang[]>({ action: "getBarang", pin });
    setLoading(false);
    if (res.ok && res.data) {
      const d = res.data as any;
      setData(Array.isArray(d?.barang) ? d.barang : Array.isArray(d) ? d : []);
    } else {
      showToast(res.error || "Gagal memuat data barang.", "error");
    }
  };

  useEffect(() => { fetchData(); }, []);

  const kategoriList = [...new Set(data.map(b => b.kategori).filter(Boolean))];

  const filtered = data.filter(b => {
    const matchSearch = !search || [b.uidbarang, b.namabarang, b.kategori, b.lastuser, b.lastkelas, b.lastuid]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()));
    const matchKategori = !filterKategori || b.kategori === filterKategori;
    const matchStatus = !filterStatus || (filterStatus === "dipinjam" ? isDipinjam(b.dipinjam) : !isDipinjam(b.dipinjam));
    return matchSearch && matchKategori && matchStatus;
  });

  const openAdd = () => { setForm(EMPTY); setEditUid(null); setShowModal(true); };
  const openEdit = (b: Barang) => { setForm({ ...b }); setEditUid(b.uidbarang); setShowModal(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    let res;
    if (editUid) {
      res = await api({ action: "updateBarang", pin, uidbarang: editUid, data: form });
    } else {
      res = await api({ action: "addBarang", pin, data: form });
    }
    setSaving(false);
    if (res.ok) {
      showToast(editUid ? "Data barang diperbarui." : "Barang berhasil ditambahkan.", "success");
      setShowModal(false);
      fetchData();
    } else {
      showToast(res.error || "Gagal menyimpan data.", "error");
    }
  };

  return (
    <div className="page-transition space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><Package className="w-5 h-5 text-primary" />Barang</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{data.length} barang terdaftar</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity shadow-sm">
          <Plus className="w-4 h-4" />Tambah Barang
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search" placeholder="Cari UID, nama, kategori, last user..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <select value={filterKategori} onChange={e => setFilterKategori(e.target.value)}
            className="py-2 pl-3 pr-8 text-sm bg-card border border-border rounded-lg focus:outline-none focus:border-primary/50">
            <option value="">Semua Kategori</option>
            {kategoriList.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="py-2 pl-3 pr-8 text-sm bg-card border border-border rounded-lg focus:outline-none focus:border-primary/50">
            <option value="">Semua Status</option>
            <option value="tersedia">Tersedia</option>
            <option value="dipinjam">Dipinjam</option>
          </select>
        </div>
      </div>

      <div className="bg-card border border-card-border rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Package className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">Tidak ada data barang</p>
            <p className="text-xs mt-1">{search || filterKategori || filterStatus ? "Ubah filter atau pencarian" : "Tambah barang untuk memulai"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {["UID Barang","Nama Barang","Kategori","Status","Last User","Last Kelas","Last Update","Last UID","Aksi"].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((b, i) => (
                  <tr key={i} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{b.uidbarang || "-"}</td>
                    <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{b.namabarang || "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{b.kategori || "-"}</td>
                    <td className="px-4 py-3"><StatusBadge value={b.dipinjam} /></td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{b.lastuser || "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{b.lastkelas || "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{b.lastupdate || "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{b.lastuid || "-"}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => openEdit(b)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors whitespace-nowrap">
                        <Edit2 className="w-3 h-3" />Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-card-border rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-base font-semibold">{editUid ? "Edit Barang" : "Tambah Barang"}</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              {[
                { field: "uidbarang", label: "UID Barang" },
                { field: "namabarang", label: "Nama Barang" },
                { field: "kategori", label: "Kategori" },
                { field: "lastuser", label: "Last User" },
                { field: "lastkelas", label: "Last Kelas" },
                { field: "lastupdate", label: "Last Update" },
                { field: "lastuid", label: "Last UID" },
              ].map(({ field, label }) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
                  <input
                    type="text"
                    value={(form as any)[field]}
                    onChange={e => setForm({ ...form, [field]: e.target.value })}
                    required={field === "uidbarang" || field === "namabarang"}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status Dipinjam</label>
                <select
                  value={form.dipinjam}
                  onChange={e => setForm({ ...form, dipinjam: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:border-primary/50"
                >
                  <option value="false">Tersedia</option>
                  <option value="true">Dipinjam</option>
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
