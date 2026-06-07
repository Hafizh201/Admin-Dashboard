import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Router } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import { ToastProvider } from "@/components/Toast";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import SiswaPage from "@/pages/Siswa";
import BarangPage from "@/pages/Barang";
import RiwayatPage from "@/pages/Riwayat";
import PeminjamanAktif from "@/pages/PeminjamanAktif";
import PinjamManual from "@/pages/PinjamManual";
import PerpanjangPage from "@/pages/Perpanjang";
import Pengaturan from "@/pages/Pengaturan";
import PublicMonitor from "@/pages/PublicMonitorV2";

const queryClient = new QueryClient();

function AdminSection() {
  const { isAuthenticated } = useAuth();

  return (
    <Router base="/admin">
      {!isAuthenticated ? (
        <Login />
      ) : (
        <DataProvider>
          <Layout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/siswa" component={SiswaPage} />
              <Route path="/barang" component={BarangPage} />
              <Route path="/riwayat" component={RiwayatPage} />
              <Route path="/peminjaman" component={PeminjamanAktif} />
              <Route path="/pinjam-manual" component={PinjamManual} />
              <Route path="/perpanjang" component={PerpanjangPage} />
              <Route path="/pengaturan" component={Pengaturan} />
              <Route component={Dashboard} />
            </Switch>
          </Layout>
        </DataProvider>
      )}
    </Router>
  );
}

function normalizePath(path: string) {
  if (path === "/") return path;
  return path.replace(/\/+$/, "") || "/";
}

function AppRoutes() {
  const [location, setLocation] = useLocation();
  const normalizedLocation = normalizePath(location);

  useEffect(() => {
    if (location !== normalizedLocation) {
      setLocation(normalizedLocation, { replace: true });
    }
  }, [location, normalizedLocation, setLocation]);

  if (normalizedLocation === "/admin" || normalizedLocation.startsWith("/admin/")) {
    return <AdminSection />;
  }

  return <PublicMonitor />;
}

function App() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <WouterRouter base={base}>
            <AppRoutes />
          </WouterRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
