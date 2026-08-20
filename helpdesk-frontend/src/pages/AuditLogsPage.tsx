import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { auditService } from "@/services/analytics";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { LoadingOverlay } from "@/components/ui/Loading";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { ScrollText } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { BackButton } from "@/components/ui/BackButton";

// ── Action badge color ────────────────────────────────────────────────────────
function actionColor(action: string): string {
  if (action.includes("CREATED"))  return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
  if (action.includes("DELETED"))  return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  if (action.includes("STATUS"))   return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  if (action.includes("ASSIGNED")) return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
  if (action.includes("UPDATED"))  return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

// ── Human readable details ────────────────────────────────────────────────────
function formatDetails(action: string, extra: Record<string, unknown>): string {
  const from = extra?.from;
  const to   = extra?.to;
  const note = extra?.note;

  if (action.includes("STATUS_CHANGED")) {
    let text = `${from ?? "—"} → ${to ?? "—"}`;
    if (note) text += ` (${note})`;
    return text;
  }

  if (action.includes("ASSIGNED")) {
    if (!from && to)  return `Assigned to agent #${to}`;
    if (from && !to)  return `Unassigned (was agent #${from})`;
    if (from && to)   return `Reassigned from agent #${from} to #${to}`;
    return "Assignment changed";
  }

  if (action.includes("TICKET_CREATED")) {
    const num      = extra?.number ?? "";
    const priority = extra?.priority ?? "";
    return [num, priority].filter(Boolean).join(" · ");
  }

  if (action.includes("USER_CREATED")) {
    const role  = extra?.role ?? "";
    const email = extra?.email ?? "";
    return [role, email].filter(Boolean).join(" · ");
  }

  if (action.includes("PRIORITY_CHANGED")) {
    return `${from ?? "—"} → ${to ?? "—"}`;
  }

  if (action.includes("UPDATED")) {
    return Object.entries(extra)
      .filter(([k]) => k !== "id")
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
  }

  // Fallback — show key:value pairs cleanly
  return Object.entries(extra)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");
}

// ── Details cell ──────────────────────────────────────────────────────────────
function DetailsCell({ action, extra }: { action: string; extra: unknown }) {
  if (!extra || typeof extra !== "object" || Object.keys(extra).length === 0) {
    return <span className="text-slate-400">—</span>;
  }

  const text = formatDetails(action, extra as Record<string, unknown>);
  return (
    <span className="text-sm text-slate-600 dark:text-slate-300">{text}</span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const logs = useApi(() => auditService.list({ page, page_size: 50 }), [page]);

  return (
    <div className="space-y-6">
      <BackButton />
      <div>
        <h1 className="page-title">Audit Logs</h1>
        <p className="page-subtitle">System activity and changes</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Feed</CardTitle>
        </CardHeader>

        {logs.isLoading ? (
          <LoadingOverlay />
        ) : logs.error ? (
          <ErrorState onRetry={logs.refetch} />
        ) : logs.data && logs.data.items.length === 0 ? (
          <EmptyState icon={<ScrollText className="h-10 w-10" />} title="No audit logs" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="table-header">
                  <tr>
                    <th className="td-cell w-36">Time</th>
                    <th className="td-cell w-40">Actor</th>
                    <th className="td-cell w-52">Action</th>
                    <th className="td-cell w-28">Entity</th>
                    <th className="td-cell">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.data?.items.map((log) => (
                    <tr key={log.id} className="table-row">
                      <td className="td-cell text-xs text-slate-400">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="td-cell text-sm font-medium text-slate-700 dark:text-slate-200">
                        {log.actor ? log.actor.full_name : (
                          <span className="text-slate-400">System</span>
                        )}
                      </td>
                      <td className="td-cell">
                        <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${actionColor(log.action)}`}>
                          {log.action.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="td-cell text-sm text-slate-500">
                        {log.entity_type} <span className="font-mono text-xs">#{log.entity_id ?? "—"}</span>
                      </td>
                      <td className="td-cell">
                        <DetailsCell action={log.action} extra={log.extra_data} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {logs.data && (
              <Pagination
                page={logs.data.page}
                totalPages={logs.data.total_pages}
                total={logs.data.total}
                pageSize={logs.data.page_size}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </Card>
    </div>
  );
}