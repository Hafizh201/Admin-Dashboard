import { useState, ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  Package,
  ClipboardList,
  BookOpen,
  PlusCircle,
  Settings,
  LogOut,
  Menu,
  X,
  Cpu,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/siswa", label: "Data Siswa", icon: Users },
  { path: "/barang", label: "Barang", icon: Package },
  { path: "/riwayat", label: "Riwayat", icon: ClipboardList },
  { path: "/peminjaman", label: "Peminjaman Aktif", icon: BookOpen },
  { path: "/pinjam-manual", label: "Pinjam Manual", icon: PlusCircle },
  { path: "/pengaturan", label: "Pengaturan", icon: Settings },
];

function NavLink({
  item,
  active,
  onClick,
}: {
  item: (typeof navItems)[0];
  active: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link href={item.path}>
      <a
        onClick={onClick}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
          active
            ? "bg-sidebar-primary/20 text-white border border-sidebar-primary/30"
            : "text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent"
        }`}
      >
        <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-sidebar-primary" : ""}`} />
        <span>{item.label}</span>
        {active && <ChevronRight className="w-3 h-3 ml-auto text-sidebar-primary" />}
      </a>
    </Link>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border flex-shrink-0">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
          <div className="w-9 h-9 rounded-lg bg-sidebar-primary/20 border border-sidebar-primary/30 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-sidebar-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white leading-tight">Smart Borrowing</p>
            <p className="text-[10px] text-sidebar-foreground/50 leading-tight">IoT System</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink key={item.path} item={item} active={location === item.path} />
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-sidebar-border">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-sidebar flex flex-col md:hidden transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sidebar-primary/20 border border-sidebar-primary/30 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-sidebar-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Smart Borrowing</p>
              <p className="text-[10px] text-sidebar-foreground/50">IoT System</p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="text-sidebar-foreground/60 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              item={item}
              active={location === item.path}
              onClick={() => setMobileOpen(false)}
            />
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-sidebar-border">
          <button
            onClick={() => { logout(); setMobileOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-border shadow-xs flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-muted-foreground hover:text-foreground p-1"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Smart Borrowing System</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
