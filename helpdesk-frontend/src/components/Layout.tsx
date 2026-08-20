import { Outlet, useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { useAuthStore } from "@/store/auth";
import { useNotificationsStore } from "@/store/notifications";
import { useEffect } from "react";
import { Bell, LogOut } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LoadingOverlay } from "./ui/Loading";

export function Layout() {
  const user = useAuthStore((s) => s.user);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const unread = useNotificationsStore((s) => s.unreadCount);
  const refreshUnread = useNotificationsStore((s) => s.refresh);

  useEffect(() => {
    if (!isInitialized) {
      fetchMe().then((u) => {
        if (!u) navigate("/login");
      });
    }
  }, [isInitialized, fetchMe, navigate]);

  useEffect(() => {
    if (!user) return;
    refreshUnread();
    const interval = setInterval(refreshUnread, 30_000);
    return () => clearInterval(interval);
  }, [user, refreshUnread]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingOverlay label="Loading workspace..." />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur lg:px-8 dark:border-slate-800 dark:bg-slate-900/80">
          <div className="lg:hidden" />
          <div className="flex items-center gap-3">
            <NavLink
              to="/notifications"
              className={cn(
                "relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              )}
            >
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </NavLink>

            <div className="mx-1 h-6 w-px bg-slate-200 dark:bg-slate-800" />

            <span className="hidden text-sm font-medium text-slate-700 sm:inline dark:text-slate-300">
              {user.full_name}
            </span>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}