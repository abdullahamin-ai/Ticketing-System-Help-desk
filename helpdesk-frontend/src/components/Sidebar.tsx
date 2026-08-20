import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Ticket,
  Plus,
  Users,
  Tags,
  BarChart3,
  ScrollText,
  Bell,
  User as UserIcon,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const sections = [
    {
      title: "Overview",
      items: [
        { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "AGENT", "CUSTOMER"] as const },
      ],
    },
    {
      title: "Tickets",
      items: [
        { to: "/tickets", label: user?.role === "CUSTOMER" ? "My Tickets" : "All Tickets", icon: Ticket, roles: ["ADMIN", "AGENT", "CUSTOMER"] as const },
        { to: "/tickets/new", label: "Create Ticket", icon: Plus, roles: ["CUSTOMER", "ADMIN"] as const },
      ],
    },
    {
      title: "Admin",
      items: [
        { to: "/users", label: "Users", icon: Users, roles: ["ADMIN"] as const },
        { to: "/categories", label: "Categories", icon: Tags, roles: ["ADMIN"] as const },
        { to: "/analytics", label: "Analytics", icon: BarChart3, roles: ["ADMIN"] as const },
        { to: "/audit-logs", label: "Audit Logs", icon: ScrollText, roles: ["ADMIN"] as const },
      ],
    },
    {
      title: "Account",
      items: [
        { to: "/notifications", label: "Notifications", icon: Bell, roles: ["ADMIN", "AGENT", "CUSTOMER"] as const },
        { to: "/profile", label: "Profile", icon: UserIcon, roles: ["ADMIN", "AGENT", "CUSTOMER"] as const },
      ],
    },
  ];

  const initials = user?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() ?? "?";

  const NavContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md shadow-brand-600/40">
            <Ticket className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold leading-tight text-slate-900 dark:text-white">Help Desk</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Support Center</p>
          </div>
        </div>
        <button
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden dark:hover:bg-slate-800"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-2">
        {sections.map((section) => {
          const items = section.items.filter((it) =>
            user ? it.roles.includes("ADMIN") : false
          );
          if (items.length === 0) return null;
          return (
            <div key={section.title} className="mb-5">
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                {section.title}
              </p>
              <ul className="space-y-0.5">
                {items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          isActive ? "nav-item-active" : "nav-item-inactive"
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span className={cn(
                            "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-all",
                            isActive
                              ? "bg-white/20"
                              : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 group-hover:bg-slate-200"
                          )}>
                            <item.icon className="h-4 w-4" />
                          </span>
                          {item.label}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-100 px-3 py-3 dark:border-slate-800">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="nav-item-inactive w-full mb-1"
        >
          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </span>
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-500 transition-all hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
        >
          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-400 dark:bg-red-500/10">
            <LogOut className="h-4 w-4" />
          </span>
          Log out
        </button>

        {/* User chip */}
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-bold text-white shadow-sm">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
              {user?.full_name}
            </p>
            <p className="truncate text-xs text-slate-400">{user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="fixed left-4 top-4 z-40 rounded-xl border border-slate-200 bg-white p-2 shadow-sm lg:hidden dark:border-slate-700 dark:bg-slate-900"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-100 bg-white transition-transform duration-300 lg:static lg:translate-x-0 dark:border-slate-800 dark:bg-[#111318]"
        )}
        style={{
          transform: open ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        {NavContent}
      </aside>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}