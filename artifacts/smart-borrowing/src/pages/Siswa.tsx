import { useEffect, useState } from "react";
import { api, Siswa } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { Plus, Search, Edit2, Loader2, Users, X } from "lucide-react";

const EMPTY: Siswa = { nama: "", level: "Siswa", uid: "", Kadaluarsa: "", kelas: "" };

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${color}`}>{children}</span>;
}

function isKadaluarsa(d: string) {
  if (!d) return false;
  return new Date(d) < new Date();
}

export default function SiswaPage() {
  const { pin } = useAuth();
  const { showToast } = useToast();
  const [data, setData] = useState<Siswa[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editUid, setEditUid] = useState<string | null>(null);
  const [form, setForm] = useState<Siswa>(EMPTY);

  const fetchData = async () => {
    setLoading(true);
    const res = await api<{ data: Siswa[] }>({ action: "getData", pin });
    setLoading(false);
    if (res.ok && res.data) {
      setData(Array.isArray((res.data as any).data) ? (res.data as any).data : Array.isArray(res.data) ? res.data as unknown as Siswa[] : []);
    } else {
      showToast(res.error || "Gagal memuat data siswa.", "error");
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = data.filter(s =>
    [s.nama, s.level, s.uid, s.Kadaluarsa, s.kelas].some(v =>
      v?.toLowerCase().includes(search.toLowerCase())
    )
  );

  const openAdd = () => { setForm(EMPTY); setEditUid(null); setShowModal(true); };
  const openEdit = (s: Siswa) => { setForm({ ...s }); setEditUid(s.uid); setShowModal(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    let res;
    if (editUid) {
      res = await api({ action: "updateData", pin, uid: editUid, data: form });
    } else {
      res = await api({ action: "addData", pin, data: form });
    }
    setSaving(false);
    if (res.ok) {
      showToast(editUid ? "Data siswa diperbarui." : "Siswa berhasil ditambahkan.", "success");
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
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><Users className="w-5 h-5 text-primary" />Data Siswa</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{data.length} siswa terdaftar</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity shadow-sm">
          <Plus className="w-4 h-4" />Tambah Siswa
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="search" placeholder="Cari nama, UID, kelas, level, kadaluarsa..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
        />
      </div>

      <div className="bg-card border border-card-border rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Users className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">Tidak ada data siswa</p>
            <p className="text-xs mt-1">{search ? "Coba ubah kata kunci pencarian" : "Tambah siswa untuk memulai"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Nama</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Level</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">UID</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Kadaluarsa</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Kelas</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((s, i) => (
                  <tr key={i} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{s.nama || "-"}</td>
                    <td className="px-4 py-3">
                      <Badge color={s.level === "Admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}>{s.level || "-"}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{s.uid || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={isKadaluarsa(s.Kadaluarsa) ? "text-red-600 font-medium" : "text-foreground"}>
                        {s.Kadaluarsa || "-"}
                      </span>
                      {isKadaluarsa(s.Kadaluarsa) && <Badge color="bg-red-100 text-red-700 ml-2">Kadaluarsa</Badge>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{s.kelas || "-"}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => openEdit(s)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-card-border rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-base font-semibold">{editUid ? "Edit Siswa" : "Tambah Siswa"}</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              {(["nama", "uid", "Kadaluarsa", "kelas"] as (keyof Siswa)[]).map(field => (
                <div key={field}>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5 capitalize">
                    {field === "Kadaluarsa" ? "Kadaluarsa (YYYY-MM-DD)" : field}
                  </label>
                  <input
                    type={field === "Kadaluarsa" ? "date" : "text"}
                    value={form[field]}
                    onChange={e => setForm({ ...form, [field]: e.target.value })}
                    required={field !== "kelas"}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Level</label>
                <select
                  value={form.level}
                  onChange={e => setForm({ ...form, level: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:border-primary/50"
                >
                  <option>Siswa</option>
                  <option>Admin</option>
                  <option>Guru</option>
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
