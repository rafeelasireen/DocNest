import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface AppLayoutProps {
  children: React.ReactNode;
  breadcrumb?: string;
}

const navItems = [
  { path: "/vault", label: "Vault" },
  { path: "/chat", label: "Chat" },
  { path: "/security", label: "Security" },
];

export function AppLayout({ children, breadcrumb }: AppLayoutProps) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/vault" className="text-xl font-bold text-primary">
            DocNest
          </Link>
          <nav className="flex gap-6">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "text-sm font-medium transition-colors",
                  location.pathname.startsWith(item.path)
                    ? "text-primary"
                    : "text-gray-500 hover:text-primary"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white"
              title={user?.name}
              aria-label="Account menu"
              aria-expanded={menuOpen}
            >
              {user ? getInitials(user.name) : "?"}
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                <div className="border-b border-gray-100 px-4 py-3">
                  <p className="truncate text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="truncate text-xs text-gray-500">{user?.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      {breadcrumb && (
        <div className="border-b border-gray-100 bg-white/50 px-6 py-2">
          <p className="mx-auto max-w-7xl text-sm text-gray-500">{breadcrumb}</p>
        </div>
      )}
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
