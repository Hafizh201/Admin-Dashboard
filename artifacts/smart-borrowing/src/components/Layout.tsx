import { useState, ReactNode } from "react";
import { useLocation } from "wouter";
import {
  LayoutDashboard, Users, Package, ClipboardList, BookOpen,
  PlusCircle, Settings, LogOut, Menu, X, Cpu, ChevronRight, WifiOff, RefreshCw,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import SyncIndicator from "./SyncIndicator";
import { AdminPageSkeleton } from "./PageSkeleton";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/siswa", label: "Data User", icon: Users },
  { path: "/barang", label: "Barang", icon: Package },
  { path: "/riwayat", label: "Riwayat", icon: ClipboardList },
  { path: "/peminjaman", label: "Peminjaman Aktif", icon: BookOpen },
  { path: "/pinjam-manual", label: "Pinjam Manual", icon: PlusCircle },
  { path: "/perpanjang", label: "Pantau Perpanjang", icon: RefreshCw },
  { path: "/pengaturan", label: "Pengaturan", icon: Settings },
];

function NavButton({ item, active, onClick }: { item: (typeof navItems)[0]; active: boolean; onClick?: () => void }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
        active
          ? "bg-sidebar-primary/20 text-white border border-sidebar-primary/30"
          : "text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent"
      }`}
    >
      <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-sidebar-primary" : ""}`} />
      <span>{item.label}</span>
      {active && <ChevronRight className="w-3 h-3 ml-auto text-sidebar-primary" />}
    </button>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { logout } = useAuth();
  const { isOffline, isLoading } = useData();
  const [mobileOpen, setMobileOpen] = useState(false);

  const SidebarContent = ({ onClose }: { onClose?: () => void }) => (
    <>
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-lg bg-sidebar-primary/20 border border-sidebar-primary/30 flex items-center justify-center">
          <Cpu className="w-5 h-5 text-sidebar-primary" />
        </div>
        <div>
          <p className="text-xs font-semibold text-white leading-tight">Smart Borrowing</p>
          <p className="text-[10px] text-sidebar-foreground/50 leading-tight">IoT System</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="ml-auto text-sidebar-foreground/60 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavButton
            key={item.path}
            item={item}
            active={location === item.path}
            onClick={() => {
              setLocation(item.path);
              onClose?.();
            }}
          />
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-sidebar-border space-y-2">
        <div className="px-3">
          <SyncIndicator />
        </div>
        <button
          onClick={() => { logout(); onClose?.(); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border flex-shrink-0">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-sidebar flex flex-col md:hidden transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent onClose={() => setMobileOpen(false)} />
      </aside>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-border shadow-xs flex-shrink-0">
          <button onClick={() => setMobileOpen(true)} className="text-muted-foreground hover:text-foreground p-1">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Cpu className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Smart Borrowing System</span>
          </div>
          <SyncIndicator />
        </header>

        {isOffline && (
          <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border-b border-orange-200 text-orange-700 text-xs font-medium">
            <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
            Offline — perubahan akan dikirim saat koneksi kembali.
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6">{isLoading ? <AdminPageSkeleton /> : children}</div>
        </main>
      </div>
    </div>
  );
}
