import { Switch, Route, Router as WouterRouter } from "wouter";
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
import Pengaturan from "@/pages/Pengaturan";

const queryClient = new QueryClient();

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
      <p className="text-4xl font-bold mb-2">404</p>
      <p className="text-sm">Halaman tidak ditemukan</p>
    </div>
  );
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Login />;

  return (
    <DataProvider>
      <Layout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/siswa" component={SiswaPage} />
          <Route path="/barang" component={BarangPage} />
          <Route path="/riwayat" component={RiwayatPage} />
          <Route path="/peminjaman" component={PeminjamanAktif} />
          <Route path="/pinjam-manual" component={PinjamManual} />
          <Route path="/pengaturan" component={Pengaturan} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </DataProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppRoutes />
          </WouterRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
