import { cn } from "@/lib/utils";
import { priorityBadge, statusBadge, statusLabel } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";

const STATUS_DOT: Record<string, string> = {
  OPEN: "bg-blue-500",
  IN_PROGRESS: "bg-amber-500",
  WAITING_FOR_CUSTOMER: "bg-purple-500",
  RESOLVED: "bg-emerald-500",
  CLOSED: "bg-slate-400",
};

const PRIORITY_DOT: Record<string, string> = {
  LOW: "bg-slate-400",
  MEDIUM: "bg-sky-500",
  HIGH: "bg-orange-500",
  URGENT: "bg-red-500",
};

export function StatusBadge({ status }: { status: string }) {
  const role = useAuthStore((s) => s.user?.role);
  return (
    <span className={cn("badge", statusBadge(status))}>
      <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[status] ?? "bg-slate-400")} />
      {statusLabel(status, role)}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={cn("badge", priorityBadge(priority))}>
      <span className={cn("h-1.5 w-1.5 rounded-full", PRIORITY_DOT[priority] ?? "bg-slate-400")} />
      {priority.charAt(0) + priority.slice(1).toLowerCase()}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    ADMIN: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    AGENT: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    CUSTOMER: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  };
  return (
    <span className={cn("badge", styles[role] ?? "")}>
      {role.charAt(0) + role.slice(1).toLowerCase()}
    </span>
  );
}