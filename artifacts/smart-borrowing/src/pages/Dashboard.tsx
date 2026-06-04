import { useEffect, useState } from "react";
import { api, BootstrapData, isDipinjam } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import {
  Users, Package, BookOpen, Activity, TrendingUp, RefreshCw, Loader2,
  UserCheck, UserX, CheckCircle, Clock, BarChart2, ArrowUpRight, RotateCcw
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";

const COLORS = ["#1d4ed8", "#16a34a", "#ca8a04", "#9333ea", "#dc2626", "#0891b2", "#ea580c"];

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number | string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-5 flex items-start gap-4 shadow-xs hover:shadow-sm transition-shadow">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-foreground leading-none">{value ?? "—"}</p>
        <p className="text-xs font-medium text-muted-foreground mt-1">{label}</p>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
      <BarChart2 className="w-4 h-4 text-primary" />{children}
    </h2>
  );
}

export default function Dashboard() {
  const { pin } = useAuth();
  const { showToast } = useToast();
  const [data, setData] = useState<BootstrapData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const res = await api<BootstrapData>({ action: "bootstrap", pin });
    setLoading(false);
    if (res.ok && res.data) {
      setData(res.data);
    } else {
      showToast(res.error || "Gagal memuat data dashboard.", "error");
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  const stats = data?.stats;

  // Use explicit stats fields from API, fall back to computing from raw data
  const siswaList = data?.siswa ?? data?.data ?? [];
  const barangList = data?.barang ?? [];
  const riwayatList = data?.riwayat ?? [];
  const now = new Date();
  const today = new Date().toISOString().slice(0, 10);

  const totalSiswa = stats?.total_siswa ?? siswaList.length;
  const siswaAktif = stats?.siswa_aktif ?? siswaList.filter(s => new Date(s.Kadaluarsa) >= now).length;
  const siswaKadaluarsa = stats?.siswa_kadaluarsa ?? (totalSiswa - siswaAktif);
  const totalBarang = stats?.total_barang ?? barangList.length;
  const barangDipinjam = stats?.barang_dipinjam ?? barangList.filter(b => isDipinjam(b.dipinjam)).length;
  const barangTersedia = stats?.barang_tersedia ?? (totalBarang - barangDipinjam);
  const totalRiwayat = stats?.total_riwayat ?? riwayatList.length;
  const riwayatHariIni = stats?.riwayat_hari_ini ?? riwayatList.filter(r => r.waktu?.startsWith(today)).length;
  const modePinjam = stats?.total_pinjam ?? riwayatList.filter(r => r.mode === "Pinjam").length;
  const modeKembali = stats?.total_kembali ?? riwayatList.filter(r => r.mode === "Kembali").length;
  const modePerpanjang = stats?.total_perpanjang ?? riwayatList.filter(r => r.mode === "Perpanjang").length;

  const kategoriData = stats?.kategori_barang
    ? Object.entries(stats.kategori_barang).map(([name, value]) => ({ name, value }))
    : [];

  const statusData = stats?.status_barang
    ? Object.entries(stats.status_barang).map(([name, value]) => ({ name, value }))
    : [{ name: "Tersedia", value: barangTersedia }, { name: "Dipinjam", value: barangDipinjam }];

  const modeData = stats?.mode_riwayat
    ? Object.entries(stats.mode_riwayat).map(([name, value]) => ({ name, value }))
    : [
        { name: "Pinjam", value: modePinjam },
        { name: "Kembali", value: modeKembali },
        { name: "Perpanjang", value: modePerpanjang },
      ];

  const aktivitasData = stats?.aktivitas_7_hari
    ? Object.entries(stats.aktivitas_7_hari).map(([name, value]) => ({ name: name.slice(5), value }))
    : [];

  return (
    <div className="page-transition space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Smart Borrowing System — Monitoring IoT</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-card border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Siswa */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Siswa</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <StatCard label="Total Siswa" value={totalSiswa} icon={Users} color="bg-blue-100 text-blue-700" />
          <StatCard label="Siswa Aktif" value={siswaAktif} icon={UserCheck} color="bg-green-100 text-green-700" />
          <StatCard label="Siswa Kadaluarsa" value={siswaKadaluarsa} icon={UserX} color="bg-red-100 text-red-700" />
        </div>
      </div>

      {/* Barang */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Barang</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <StatCard label="Total Barang" value={totalBarang} icon={Package} color="bg-purple-100 text-purple-700" />
          <StatCard label="Tersedia" value={barangTersedia} icon={CheckCircle} color="bg-green-100 text-green-700" />
          <StatCard label="Dipinjam" value={barangDipinjam} icon={BookOpen} color="bg-blue-100 text-blue-700" />
        </div>
      </div>

      {/* Riwayat */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Riwayat</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard label="Total Riwayat" value={totalRiwayat} icon={Activity} color="bg-orange-100 text-orange-700" />
          <StatCard label="Hari Ini" value={riwayatHariIni} icon={Clock} color="bg-cyan-100 text-cyan-700" />
          <StatCard label="Mode Pinjam" value={modePinjam} icon={ArrowUpRight} color="bg-blue-100 text-blue-700" />
          <StatCard label="Mode Kembali" value={modeKembali} icon={TrendingUp} color="bg-green-100 text-green-700" />
          <StatCard label="Perpanjang" value={modePerpanjang} icon={RotateCcw} color="bg-yellow-100 text-yellow-700" />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {aktivitasData.length > 0 && (
          <div className="bg-card border border-card-border rounded-xl p-5 shadow-xs">
            <SectionTitle>Aktivitas 7 Hari Terakhir</SectionTitle>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={aktivitasData} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="value" fill="#1d4ed8" radius={[4, 4, 0, 0]} name="Aktivitas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {modeData.length > 0 && (
          <div className="bg-card border border-card-border rounded-xl p-5 shadow-xs">
            <SectionTitle>Mode Riwayat</SectionTitle>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={modeData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={70}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false} fontSize={11}
                >
                  {modeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {kategoriData.length > 0 && (
          <div className="bg-card border border-card-border rounded-xl p-5 shadow-xs">
            <SectionTitle>Kategori Barang</SectionTitle>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={kategoriData} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Jumlah">
                  {kategoriData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {statusData.length > 0 && (
          <div className="bg-card border border-card-border rounded-xl p-5 shadow-xs">
            <SectionTitle>Status Barang</SectionTitle>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={70}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false} fontSize={11}
                >
                  {statusData.map((_, i) => <Cell key={i} fill={["#16a34a", "#1d4ed8"][i % 2]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {aktivitasData.length === 0 && modeData.length === 0 && kategoriData.length === 0 && statusData.length === 0 && (
          <div className="lg:col-span-2 bg-card border border-card-border rounded-xl flex flex-col items-center justify-center py-16 text-muted-foreground">
            <BarChart2 className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">Belum ada data grafik</p>
            <p className="text-xs mt-1">Data grafik akan muncul setelah ada aktivitas</p>
          </div>
        )}
      </div>
    </div>
  );
}
