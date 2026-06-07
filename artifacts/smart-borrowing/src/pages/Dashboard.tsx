import { useData } from "@/contexts/DataContext";
import { isDipinjam, isSiswaAktif } from "@/lib/api";
import {
  Users, Package, BookOpen, Activity, TrendingUp, RefreshCw,
  UserCheck, UserX, CheckCircle, Clock, BarChart2, ArrowUpRight, RotateCcw, Info,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

const COLORS = ["#1d4ed8", "#16a34a", "#ca8a04", "#9333ea", "#dc2626", "#0891b2", "#ea580c"];
const STATUS_COLORS: Record<string, string> = {
  Tersedia: "#16a34a",
  Dipinjam: "#1d4ed8",
};

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
    <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
      <BarChart2 className="w-4 h-4 text-primary" />{children}
    </h2>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-card-border rounded-2xl p-5 shadow-xs overflow-hidden">
      <SectionTitle>{title}</SectionTitle>
      {children}
    </div>
  );
}

function StatusLegend({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
      {data.map((item) => (
        <div key={item.name} className="flex items-center gap-2 font-medium text-muted-foreground">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[item.name] || "#64748b" }} />
          <span>{item.name}</span>
          <span className="font-bold text-foreground">{item.value}</span>
          <span className="text-xs">({Math.round((item.value / total) * 100)}%)</span>
        </div>
      ))}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="bg-card border border-card-border rounded-xl flex flex-col items-center justify-center py-16 text-muted-foreground">
      <BarChart2 className="w-10 h-10 mb-3 opacity-30" />
      <p className="text-sm font-medium">Belum ada data grafik</p>
    </div>
  );
}

export default function Dashboard() {
  const { siswa, barang, riwayat, stats, isFromCache, lastUpdate, refreshSilent } = useData();

  const today = new Date().toISOString().slice(0, 10);

  const totalSiswa = siswa.length;
  const siswaAktif = siswa.filter(isSiswaAktif).length;
  const siswaKadaluarsa = totalSiswa - siswaAktif;

  const totalBarang = stats?.total_barang ?? barang.length;
  const barangDipinjam = stats?.barang_dipinjam ?? barang.filter(b => isDipinjam(b.dipinjam)).length;
  const barangTersedia = stats?.barang_tersedia ?? (totalBarang - barangDipinjam);
  const totalRiwayat = stats?.total_riwayat ?? riwayat.length;
  const riwayatHariIni = stats?.riwayat_hari_ini ?? riwayat.filter(r => r.waktu?.startsWith(today)).length;
  const modePinjam = stats?.total_pinjam ?? riwayat.filter(r => String(r.mode || "").toLowerCase() === "pinjam").length;
  const modeKembali = stats?.total_kembali ?? riwayat.filter(r => String(r.mode || "").toLowerCase() === "kembali").length;
  const modePerpanjang = stats?.total_perpanjang ?? riwayat.filter(r => String(r.mode || "").toLowerCase() === "perpanjang").length;

  const kategoriData = stats?.kategori_barang
    ? Object.entries(stats.kategori_barang).map(([name, value]) => ({ name, value }))
    : [];
  const statusData = stats?.status_barang
    ? Object.entries(stats.status_barang).map(([name, value]) => ({ name, value }))
    : [{ name: "Tersedia", value: barangTersedia }, { name: "Dipinjam", value: barangDipinjam }];
  const filteredStatusData = statusData.filter(s => s.value > 0);
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
          onClick={refreshSilent}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-card border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {isFromCache && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-xs font-medium">
          <Info className="w-3.5 h-3.5 flex-shrink-0" />
          Menampilkan data dari cache. Memuat data terbaru...
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">User</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <StatCard label="Total User" value={totalSiswa} icon={Users} color="bg-blue-100 text-blue-700" />
          <StatCard label="User Aktif" value={siswaAktif} icon={UserCheck} color="bg-green-100 text-green-700" />
          <StatCard label="User Kadaluarsa" value={siswaKadaluarsa} icon={UserX} color="bg-red-100 text-red-700" />
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Barang</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <StatCard label="Total Barang" value={totalBarang} icon={Package} color="bg-purple-100 text-purple-700" />
          <StatCard label="Tersedia" value={barangTersedia} icon={CheckCircle} color="bg-green-100 text-green-700" />
          <StatCard label="Dipinjam" value={barangDipinjam} icon={BookOpen} color="bg-blue-100 text-blue-700" />
        </div>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {aktivitasData.length > 0 && (
          <ChartCard title="Aktivitas 7 Hari Terakhir">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={aktivitasData} margin={{ top: 8, right: 12, left: -16, bottom: 4 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0" }} />
                <Bar dataKey="value" fill="#1d4ed8" radius={[6, 6, 0, 0]} name="Aktivitas" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
        {modeData.filter(m => m.value > 0).length > 0 && (
          <ChartCard title="Mode Riwayat">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <Pie data={modeData.filter(m => m.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={78} innerRadius={44} paddingAngle={2}>
                  {modeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0" }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
        {kategoriData.length > 0 && (
          <ChartCard title="Kategori Barang">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={kategoriData} margin={{ top: 8, right: 12, left: -16, bottom: 4 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0" }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Jumlah">
                  {kategoriData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
        {filteredStatusData.length > 0 && (
          <ChartCard title="Status Barang">
            <div className="flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart margin={{ top: 6, right: 20, bottom: 6, left: 20 }}>
                  <Pie
                    data={filteredStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={82}
                    innerRadius={48}
                    paddingAngle={2}
                    stroke="#ffffff"
                    strokeWidth={3}
                  >
                    {filteredStatusData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "#64748b"} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0" }} />
                </PieChart>
              </ResponsiveContainer>
              <StatusLegend data={filteredStatusData} />
            </div>
          </ChartCard>
        )}
        {aktivitasData.length === 0 && modeData.every(m => m.value === 0) && <EmptyChart />}
      </div>

      {lastUpdate && (
        <p className="text-xs text-muted-foreground/50 text-right">
          Terakhir diperbarui: {new Date(lastUpdate).toLocaleString("id-ID")}
        </p>
      )}
    </div>
  );
}
