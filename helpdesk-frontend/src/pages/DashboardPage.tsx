import { useAuthStore } from "@/store/auth";
import { useApi } from "@/hooks/useApi";
import { ticketService } from "@/services/tickets";
import { analyticsService } from "@/services/analytics";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { LoadingOverlay } from "@/components/ui/Loading";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge, PriorityBadge } from "@/components/ui/Badge";
import { Link } from "react-router-dom";
import {
  Ticket as TicketIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Plus,
  ArrowRight,
  Users,
  BarChart2,
  Tag,
  ShieldCheck,
  Bell,
  Settings,
} from "lucide-react";
import { AnalyticsResponse, TicketListItem } from "@/types";
import { relativeTime, initials, avatarColor, priorityBar } from "@/lib/utils";
import { useCountUp } from "@/hooks/useCountUp";

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;
  if (user.role === "ADMIN") return <AdminDashboard />;
  if (user.role === "AGENT") return <AgentDashboard />;
  return <CustomerDashboard />;
}

/* ── Stat Card ── */
function StatCard({
  title,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  trend,
}: {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  trend?: string;
}) {
  const numeric = typeof value === "number" ? value : null;
  const animated = useCountUp(numeric ?? 0);
  const display = numeric !== null ? animated : value;

  return (
    <Card className="group relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className={`absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${iconBg} [mask-image:radial-gradient(ellipse_at_top_right,black_0%,transparent_70%)]`} />
      <CardBody className="relative flex items-start gap-4">
        <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${iconBg} transition-transform duration-200 group-hover:scale-110`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            {title}
          </p>
          <p className="mt-0.5 text-3xl font-extrabold tabular-nums tracking-tight text-slate-900 dark:text-white">
            {display}
          </p>
          {trend && <p className="mt-1 text-xs text-slate-400">{trend}</p>}
        </div>
      </CardBody>
    </Card>
  );
}

/* ── Quick Action Card ── */
function QuickActionCard({
  to,
  icon: Icon,
  iconBg,
  iconColor,
  label,
  description,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  label: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:border-brand-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-700"
    >
      <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${iconBg} transition-transform group-hover:scale-110`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-800 dark:text-slate-100">{label}</p>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 flex-shrink-0 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-brand-500 dark:text-slate-600" />
    </Link>
  );
}

/* ── Page header ── */
function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

/* ── Recent Tickets Skeleton ── */
function RecentTicketsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3.5 pl-5 pr-4">
          <div className="h-9 w-9 flex-shrink-0 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-2.5 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-3.5 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-2.5 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
            <div className="h-4 w-20 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-14 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Recent Tickets ── */
function RecentTickets({
  items,
  emptyTitle,
}: {
  items: TicketListItem[];
  emptyTitle: string;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<TicketIcon className="h-10 w-10" />}
        title={emptyTitle}
        description="When activity appears, it will show up here."
      />
    );
  }
  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
      {items.map((t) => (
        <Link
          key={t.id}
          to={`/tickets/${t.id}`}
          className="group relative flex items-center gap-3 py-3.5 pl-5 pr-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30"
        >
          <span className={`absolute left-0 top-0 h-full w-1 ${priorityBar(t.priority)}`} />
          <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColor(t.customer.full_name)}`}>
            {initials(t.customer.full_name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[11px] font-medium text-slate-400">{t.number}</p>
            <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
              {t.subject}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {t.customer.full_name} · {relativeTime(t.created_at)}
            </p>
          </div>
          <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
            <StatusBadge status={t.status} />
            <PriorityBadge priority={t.priority} />
          </div>
          <ArrowRight className="h-4 w-4 flex-shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500 dark:text-slate-600" />
        </Link>
      ))}
    </div>
  );
}

/* ── Customer Dashboard ── */
function CustomerDashboard() {
  const tickets = useApi(() => ticketService.list({ page_size: 5 }), []);
  const all = useApi(() => ticketService.list({ page_size: 100 }), []);

  const total = all.data?.total ?? 0;
  const open = all.data?.items.filter((t) => t.status === "OPEN").length ?? 0;
  const inProgress = all.data?.items.filter((t) => t.status === "IN_PROGRESS").length ?? 0;
  const resolved = all.data?.items.filter((t) => t.status === "RESOLVED").length ?? 0;

  return (
    <div className="space-y-7">
      <PageHeader
        title="Welcome back 👋"
        subtitle="Here's an overview of your support activity."
        action={
          <Link to="/tickets/new" className="btn-primary">
            <Plus className="h-4 w-4" /> New ticket
          </Link>
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total" value={total} icon={TicketIcon} iconBg="bg-blue-50 dark:bg-blue-900/20" iconColor="text-blue-600 dark:text-blue-400" />
        <StatCard title="Open" value={open} icon={AlertCircle} iconBg="bg-amber-50 dark:bg-amber-900/20" iconColor="text-amber-600 dark:text-amber-400" />
        <StatCard title="In Progress" value={inProgress} icon={Clock} iconBg="bg-purple-50 dark:bg-purple-900/20" iconColor="text-purple-600 dark:text-purple-400" />
        <StatCard title="Resolved" value={resolved} icon={CheckCircle2} iconBg="bg-emerald-50 dark:bg-emerald-900/20" iconColor="text-emerald-600 dark:text-emerald-400" />
      </div>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Recent Tickets</CardTitle>
            <p className="section-subtitle mt-0.5">Your latest support requests</p>
          </div>
          <Link to="/tickets" className="btn-ghost py-1.5 text-xs">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardBody className="p-0">
          {tickets.isLoading ? (
            <RecentTicketsSkeleton />
          ) : tickets.error ? (
            <ErrorState onRetry={tickets.refetch} />
          ) : (
            <RecentTickets items={tickets.data?.items ?? []} emptyTitle="No tickets yet" />
          )}
        </CardBody>
      </Card>
    </div>
  );
}

/* ── Agent Dashboard ── */
function AgentDashboard() {
  const tickets = useApi(() => ticketService.list({ page_size: 5 }), []);
  const all = useApi(() => ticketService.list({ page_size: 100 }), []);

  const total = all.data?.total ?? 0;
  const open = all.data?.items.filter((t) => t.status === "OPEN").length ?? 0;
  const waiting = all.data?.items.filter((t) => t.status === "WAITING_FOR_CUSTOMER").length ?? 0;
  const resolved = all.data?.items.filter((t) => t.status === "RESOLVED").length ?? 0;

  return (
    <div className="space-y-7">
      <PageHeader
        title="Agent Dashboard"
        subtitle="Your assigned tickets and performance."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Assigned to me" value={total} icon={TicketIcon} iconBg="bg-blue-50 dark:bg-blue-900/20" iconColor="text-blue-600 dark:text-blue-400" />
        <StatCard title="Open" value={open} icon={AlertCircle} iconBg="bg-amber-50 dark:bg-amber-900/20" iconColor="text-amber-600 dark:text-amber-400" />
        <StatCard title="Waiting on Customer" value={waiting} icon={Clock} iconBg="bg-purple-50 dark:bg-purple-900/20" iconColor="text-purple-600 dark:text-purple-400" />
        <StatCard title="Resolved" value={resolved} icon={CheckCircle2} iconBg="bg-emerald-50 dark:bg-emerald-900/20" iconColor="text-emerald-600 dark:text-emerald-400" />
      </div>

      {/* Agent Quick Actions */}
      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <QuickActionCard to="/tickets" icon={TicketIcon} iconBg="bg-blue-50 dark:bg-blue-900/20" iconColor="text-blue-600 dark:text-blue-400" label="All Tickets" description="View and manage tickets" />
          <QuickActionCard to="/notifications" icon={Bell} iconBg="bg-amber-50 dark:bg-amber-900/20" iconColor="text-amber-600 dark:text-amber-400" label="Notifications" description="Check your alerts" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Recent Assigned Tickets</CardTitle>
            <p className="section-subtitle mt-0.5">Tickets waiting for your response</p>
          </div>
          <Link to="/tickets" className="btn-ghost py-1.5 text-xs">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardBody className="p-0">
          {tickets.isLoading ? (
            <RecentTicketsSkeleton />
          ) : tickets.error ? (
            <ErrorState onRetry={tickets.refetch} />
          ) : (
            <RecentTickets items={tickets.data?.items ?? []} emptyTitle="Nothing assigned yet" />
          )}
        </CardBody>
      </Card>
    </div>
  );
}

/* ── Admin Dashboard ── */
function AdminDashboard() {
  const analytics = useApi<AnalyticsResponse>(() => analyticsService.summary(), []);

  if (analytics.isLoading) return <LoadingOverlay />;
  if (analytics.error || !analytics.data) return <ErrorState onRetry={analytics.refetch} />;

  const a = analytics.data;

  return (
    <div className="space-y-7">
      <PageHeader
        title="Admin Dashboard"
        subtitle="System-wide ticket health and trends."
        action={
          <Link to="/tickets/new" className="btn-primary">
            <Plus className="h-4 w-4" /> New Ticket
          </Link>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Tickets" value={a.total_tickets} icon={TicketIcon} iconBg="bg-blue-50 dark:bg-blue-900/20" iconColor="text-blue-600 dark:text-blue-400" />
        <StatCard title="Open" value={a.open} icon={AlertCircle} iconBg="bg-amber-50 dark:bg-amber-900/20" iconColor="text-amber-600 dark:text-amber-400" />
        <StatCard title="In Progress" value={a.in_progress} icon={Clock} iconBg="bg-purple-50 dark:bg-purple-900/20" iconColor="text-purple-600 dark:text-purple-400" />
        <StatCard title="Resolved" value={a.resolved} icon={CheckCircle2} iconBg="bg-emerald-50 dark:bg-emerald-900/20" iconColor="text-emerald-600 dark:text-emerald-400" />
      </div>

      {/* Quick Actions — Admin */}
      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickActionCard
            to="/tickets"
            icon={TicketIcon}
            iconBg="bg-blue-50 dark:bg-blue-900/20"
            iconColor="text-blue-600 dark:text-blue-400"
            label="All Tickets"
            description="View, filter and manage tickets"
          />
          <QuickActionCard
            to="/users"
            icon={Users}
            iconBg="bg-emerald-50 dark:bg-emerald-900/20"
            iconColor="text-emerald-600 dark:text-emerald-400"
            label="Users"
            description="Manage agents and customers"
          />
          <QuickActionCard
            to="/analytics"
            icon={BarChart2}
            iconBg="bg-purple-50 dark:bg-purple-900/20"
            iconColor="text-purple-600 dark:text-purple-400"
            label="Analytics"
            description="Reports and performance data"
          />
          <QuickActionCard
            to="/categories"
            icon={Tag}
            iconBg="bg-orange-50 dark:bg-orange-900/20"
            iconColor="text-orange-600 dark:text-orange-400"
            label="Categories"
            description="Organize ticket categories"
          />
          <QuickActionCard
            to="/audit-logs"
            icon={ShieldCheck}
            iconBg="bg-rose-50 dark:bg-rose-900/20"
            iconColor="text-rose-600 dark:text-rose-400"
            label="Audit Logs"
            description="System activity history"
          />
          <QuickActionCard
            to="/notifications"
            icon={Bell}
            iconBg="bg-amber-50 dark:bg-amber-900/20"
            iconColor="text-amber-600 dark:text-amber-400"
            label="Notifications"
            description="Check system alerts"
          />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* By Status */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>By Status</CardTitle>
              <p className="section-subtitle mt-0.5">Ticket distribution</p>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            {[
              { label: "Open", value: a.open, color: "bg-blue-500" },
              { label: "In Progress", value: a.in_progress, color: "bg-amber-500" },
              { label: "Waiting for Customer", value: a.waiting_for_customer, color: "bg-purple-500" },
              { label: "Resolved", value: a.resolved, color: "bg-emerald-500" },
              { label: "Closed", value: a.closed, color: "bg-slate-400" },
            ].map((row) => {
              const pct = a.total_tickets ? (row.value / a.total_tickets) * 100 : 0;
              return (
                <div key={row.label}>
                  <div className="mb-1.5 flex justify-between">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{row.label}</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{row.value}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className={`h-full rounded-full ${row.color} transition-all duration-700`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>

        {/* By Priority */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>By Priority</CardTitle>
              <p className="section-subtitle mt-0.5">Current open tickets</p>
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            {a.by_priority.length === 0 ? (
              <p className="text-sm text-slate-400">No data yet.</p>
            ) : (
              a.by_priority.map((p) => (
                <div key={p.priority} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/50">
                  <PriorityBadge priority={p.priority} />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{p.count}</span>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        {/* Insights */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Insights</CardTitle>
              <p className="section-subtitle mt-0.5">Performance overview</p>
            </div>
          </CardHeader>
          <CardBody className="space-y-5">
            <div className="flex items-center gap-4 rounded-2xl bg-brand-50 px-4 py-3 dark:bg-brand-900/20">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-900/40">
                <TrendingUp className="h-5 w-5 text-brand-600 dark:text-brand-400" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">Avg Resolution</p>
                <p className="text-2xl font-extrabold text-brand-700 dark:text-brand-300">
                  {a.average_resolution_hours !== null ? `${a.average_resolution_hours}h` : "—"}
                </p>
              </div>
            </div>
            <div>
              <p className="mb-2.5 text-xs font-bold uppercase tracking-widest text-slate-400">Top Agents</p>
              <div className="space-y-2">
                {a.by_agent.slice(0, 5).map((ag, i) => (
                  <div key={ag.agent_id ?? "unassigned"} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 dark:bg-slate-800">
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate text-sm text-slate-700 dark:text-slate-300">
                      {ag.agent_name ?? "Unassigned"}
                    </span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{ag.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}