import { useApi } from "@/hooks/useApi";
import { analyticsService } from "@/services/analytics";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { LoadingOverlay } from "@/components/ui/Loading";
import { ErrorState } from "@/components/ui/ErrorState";
import { PriorityBadge } from "@/components/ui/Badge";
import { BackButton } from "@/components/ui/BackButton";
import { Ticket, CheckCircle2, AlertCircle, Clock, TrendingUp } from "lucide-react";

export function AnalyticsPage() {
  const analytics = useApi(() => analyticsService.summary(), []);

  if (analytics.isLoading) return <LoadingOverlay />;
  if (analytics.error || !analytics.data) return <ErrorState onRetry={analytics.refetch} />;

  const data = analytics.data;
  const total = data.total_tickets || 1;

  return (
    <div className="space-y-6">
      <BackButton />
      <div>
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">System-wide ticket insights</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="Total tickets" value={data.total_tickets} icon={Ticket} color="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300" />
        <Stat title="Open" value={data.open} icon={AlertCircle} color="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300" />
        <Stat title="In progress" value={data.in_progress} icon={Clock} color="bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300" />
        <Stat title="Resolved" value={data.resolved} icon={CheckCircle2} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300" />
      </div>

      <Card>
        <CardHeader><CardTitle>Status breakdown</CardTitle></CardHeader>
        <CardBody className="space-y-3">
          {[
            { label: "Open", value: data.open, color: "bg-blue-500" },
            { label: "In progress", value: data.in_progress, color: "bg-amber-500" },
            { label: "Waiting for customer", value: data.waiting_for_customer, color: "bg-purple-500" },
            { label: "Resolved", value: data.resolved, color: "bg-emerald-500" },
            { label: "Closed", value: data.closed, color: "bg-slate-500" },
          ].map((r) => {
            const pct = (r.value / total) * 100;
            return (
              <div key={r.label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{r.label}</span>
                  <span className="font-medium">{r.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div className={`h-full ${r.color} transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>By priority</CardTitle></CardHeader>
          <CardBody className="space-y-2">
            {data.by_priority.length === 0 ? (
              <p className="text-sm text-slate-500">No data</p>
            ) : (
              data.by_priority.map((p) => (
                <div key={p.priority} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                  <PriorityBadge priority={p.priority} />
                  <span className="font-semibold">{p.count}</span>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>By category</CardTitle></CardHeader>
          <CardBody className="space-y-2">
            {data.by_category.length === 0 ? (
              <p className="text-sm text-slate-500">No data</p>
            ) : (
              data.by_category.map((c) => (
                <div key={c.category_id ?? "none"} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                  <span className="text-sm">{c.category_name ?? "Uncategorized"}</span>
                  <span className="font-semibold">{c.count}</span>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>By agent</CardTitle></CardHeader>
          <CardBody className="space-y-2">
            {data.by_agent.length === 0 ? (
              <p className="text-sm text-slate-500">No data</p>
            ) : (
              data.by_agent.map((a) => (
                <div key={a.agent_id ?? "unassigned"} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                  <span className="text-sm">{a.agent_name ?? "Unassigned"}</span>
                  <span className="font-semibold">{a.count}</span>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Performance</CardTitle></CardHeader>
        <CardBody>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Average resolution time</p>
              <p className="text-2xl font-bold">
                {data.average_resolution_hours !== null ? `${data.average_resolution_hours} hours` : "No resolved tickets yet"}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function Stat({ title, value, icon: Icon, color }: { title: string; value: number; icon: React.ComponentType<{ className?: string }>; color: string }) {
  return (
    <Card>
      <CardBody className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardBody>
    </Card>
  );
}