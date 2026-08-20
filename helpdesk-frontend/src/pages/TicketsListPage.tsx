import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ticketService, TicketListParams } from "@/services/tickets";
import { categoryService } from "@/services/categories";
import { useApi } from "@/hooks/useApi";
import { Card, CardBody } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { StatusBadge, PriorityBadge } from "@/components/ui/Badge";
import { TableSkeleton } from "@/components/ui/Loading";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  CategoryRead,
  TicketListItem,
  TicketStatus,
  TicketPriority,
} from "@/types";
import {
  Search,
  ChevronRight,
  Plus,
  SlidersHorizontal,
  Download,
  XCircle,
  CheckSquare,
  Square,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { relativeTime } from "@/lib/utils";
import toast from "react-hot-toast";
import { BackButton } from "@/components/ui/BackButton";

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "WAITING_FOR_CUSTOMER", label: "Waiting" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];

function exportToCsv(items: TicketListItem[]) {
  const headers = ["Ticket #", "Subject", "Customer", "Status", "Priority", "Updated"];
  const rows = items.map((t) => [
    t.number,
    `"${t.subject.replace(/"/g, '""')}"`,
    `"${t.customer.full_name.replace(/"/g, '""')}"`,
    t.status,
    t.priority,
    new Date(t.updated_at).toLocaleString(),
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tickets-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function InlineStatusSelect({
  current,
  ticketId,
  onChanged,
}: {
  current: TicketStatus;
  ticketId: number;
  onChanged: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelect = async (status: TicketStatus) => {
    if (status === current) { setOpen(false); return; }
    setOpen(false);
    setLoading(true);
    try {
      await ticketService.changeStatus(ticketId, { status });
      toast.success("Status updated");
      onChanged();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v); }}
        disabled={loading}
        className="flex items-center gap-1 rounded-lg border border-transparent px-2 py-1 text-xs transition hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-800 disabled:opacity-50"
      >
        <StatusBadge status={current} />
        {loading
          ? <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
          : <ChevronDown className="h-3 w-3 text-slate-400" />
        }
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 min-w-[160px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-slate-50 dark:hover:bg-slate-800 ${
                opt.value === current
                  ? "font-semibold text-brand-600 dark:text-brand-400"
                  : "text-slate-700 dark:text-slate-300"
              }`}
            >
              {opt.label}
              {opt.value === current && <span className="ml-auto text-brand-500">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BulkToolbar({
  selectedIds,
  onClearSelection,
  onBulkStatusChange,
  onBulkDelete,
  isBulkLoading,
}: {
  selectedIds: number[];
  onClearSelection: () => void;
  onBulkStatusChange: (status: TicketStatus) => void;
  onBulkDelete: () => void;
  isBulkLoading: boolean;
}) {
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!statusMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node))
        setStatusMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [statusMenuOpen]);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 dark:border-brand-800/40 dark:bg-brand-900/20">
      <span className="text-sm font-semibold text-brand-700 dark:text-brand-300">
        {selectedIds.length} selected
      </span>
      <div className="mx-2 h-4 w-px bg-brand-200 dark:bg-brand-700" />
      <div className="relative" ref={statusRef}>
        <Button
          size="sm"
          variant="secondary"
          disabled={isBulkLoading}
          onClick={() => setStatusMenuOpen((v) => !v)}
        >
          <CheckSquare className="h-3.5 w-3.5" />
          Change Status
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
        {statusMenuOpen && (
          <div className="absolute left-0 top-full z-20 mt-1 min-w-[160px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setStatusMenuOpen(false); onBulkStatusChange(opt.value); }}
                className="flex w-full items-center px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <Button
        size="sm"
        variant="danger"
        disabled={isBulkLoading}
        isLoading={isBulkLoading}
        onClick={onBulkDelete}
      >
        <XCircle className="h-3.5 w-3.5" />
        Close
      </Button>
      <button
        onClick={onClearSelection}
        className="ml-auto text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
      >
        Clear selection
      </button>
    </div>
  );
}

export function TicketsListPage() {
  const user = useAuthStore((s) => s.user);
  const canManage = user?.role === "ADMIN" || user?.role === "AGENT";


  const [params, setParams] = useState<TicketListParams>({
    page: 1,
    page_size: 20,
    sort_by: "created_at",
    sort_dir: "desc",
  });
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const categories = useApi<CategoryRead[]>(
    () => categoryService.list({ page_size: 200 }).then((p) => p.items),
    []
  );
  const tickets = useApi(() => ticketService.list(params), [params]);

  useEffect(() => { setSelectedIds([]); }, [params]);

  useEffect(() => {
    const t = setTimeout(() => {
      setParams((p) => ({ ...p, search: search || undefined, page: 1 }));
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const total = tickets.data?.total ?? 0;
  const items = tickets.data?.items ?? [];

  const allPageIds = useMemo(() => items.map((t) => t.id), [items]);
  const allSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedIds.includes(id));
  const someSelected = allPageIds.some((id) => selectedIds.includes(id)) && !allSelected;

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !allPageIds.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...allPageIds])]);
    }
  }, [allSelected, allPageIds]);

  const toggleOne = useCallback((id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const handleBulkStatusChange = async (status: TicketStatus) => {
    if (selectedIds.length === 0) return;
    setIsBulkLoading(true);
    const toastId = toast.loading(`Updating ${selectedIds.length} tickets…`);
    try {
      await Promise.all(
        selectedIds.map((id) => ticketService.changeStatus(id, { status }).catch(() => null))
      );
      toast.success(`${selectedIds.length} tickets updated`, { id: toastId });
      setSelectedIds([]);
      tickets.refetch();
    } catch {
      toast.error("Some updates failed", { id: toastId });
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    setDeleteDialogOpen(false);
    if (selectedIds.length === 0) return;
    setIsBulkLoading(true);
    const toastId = toast.loading(`Closing ${selectedIds.length} tickets…`);
    try {
      await Promise.all(
        selectedIds.map((id) => ticketService.close(id).catch(() => null))
      );
      toast.success(`${selectedIds.length} tickets closed`, { id: toastId });
      setSelectedIds([]);
      tickets.refetch();
    } catch {
      toast.error("Some actions failed", { id: toastId });
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    const toastId = toast.loading("Preparing CSV…");
    try {
      const PAGE_SIZE = 100;
      const first = await ticketService.list({ ...params, page: 1, page_size: PAGE_SIZE });
      const allItems = [...first.items];
      const totalPages = first.total_pages;

      // Fetch remaining pages if more than 1
      if (totalPages > 1) {
        const requests = [];
        for (let p = 2; p <= totalPages; p++) {
          requests.push(ticketService.list({ ...params, page: p, page_size: PAGE_SIZE }));
        }
        const results = await Promise.all(requests);
        results.forEach((r) => allItems.push(...r.items));
      }

      exportToCsv(allItems);
      toast.success(`Exported ${allItems.length} tickets`, { id: toastId });
    } catch {
      toast.error("Export failed", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <BackButton />
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">
            {user?.role === "CUSTOMER" ? "My Tickets" : "All Tickets"}
          </h1>
          <p className="page-subtitle">
            {total > 0 ? (
              <>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{total}</span>{" "}
                ticket{total !== 1 ? "s" : ""} found
              </>
            ) : (
              "No tickets found"
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExport}
              isLoading={isExporting}
              disabled={isExporting || tickets.isLoading}
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          )}
          {(user?.role === "CUSTOMER" || user?.role === "ADMIN") && (
            <Link to="/tickets/new" className="btn-primary">
              <Plus className="h-4 w-4" />
              New Ticket
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardBody className="py-4">
          <div className="flex flex-wrap items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 flex-shrink-0 text-slate-400" />
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9"
                placeholder="Search tickets…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              value={params.status ?? ""}
              onChange={(e) =>
                setParams((p) => ({ ...p, status: (e.target.value as TicketStatus) || undefined, page: 1 }))
              }
              options={[
                { value: "", label: "All statuses" },
                { value: "OPEN", label: "Open" },
                { value: "IN_PROGRESS", label: "In progress" },
                { value: "WAITING_FOR_CUSTOMER", label: "Waiting" },
                { value: "RESOLVED", label: "Resolved" },
                { value: "CLOSED", label: "Closed" },
              ]}
            />
            <Select
              value={params.priority ?? ""}
              onChange={(e) =>
                setParams((p) => ({ ...p, priority: (e.target.value as TicketPriority) || undefined, page: 1 }))
              }
              options={[
                { value: "", label: "All priorities" },
                { value: "LOW", label: "Low" },
                { value: "MEDIUM", label: "Medium" },
                { value: "HIGH", label: "High" },
                { value: "URGENT", label: "Urgent" },
              ]}
            />
            <Select
              value={params.category_id?.toString() ?? ""}
              onChange={(e) =>
                setParams((p) => ({ ...p, category_id: e.target.value ? Number(e.target.value) : undefined, page: 1 }))
              }
              options={[
                { value: "", label: "All categories" },
                ...(categories.data ?? []).map((c) => ({ value: c.id.toString(), label: c.name })),
              ]}
            />
            <Select
              value={`${params.sort_by ?? "created_at"}:${params.sort_dir ?? "desc"}`}
              onChange={(e) => {
                const [sort_by, sort_dir] = e.target.value.split(":") as [TicketListParams["sort_by"], "asc" | "desc"];
                setParams((p) => ({ ...p, sort_by, sort_dir }));
              }}
              options={[
                { value: "created_at:desc", label: "Newest first" },
                { value: "created_at:asc", label: "Oldest first" },
                { value: "updated_at:desc", label: "Recently updated" },
                { value: "priority:desc", label: "Priority ↓" },
                { value: "number:asc", label: "Ticket # ↑" },
              ]}
            />
          </div>
        </CardBody>
      </Card>

      {/* Bulk toolbar */}
      {canManage && selectedIds.length > 0 && (
        <BulkToolbar
          selectedIds={selectedIds}
          onClearSelection={() => setSelectedIds([])}
          onBulkStatusChange={handleBulkStatusChange}
          onBulkDelete={() => setDeleteDialogOpen(true)}
          isBulkLoading={isBulkLoading}
        />
      )}

      {/* Table */}
      <Card>
        {tickets.isLoading ? (
          <div className="p-6"><TableSkeleton /></div>
        ) : tickets.error ? (
          <ErrorState onRetry={tickets.refetch} />
        ) : items.length === 0 ? (
          <EmptyState title="No tickets found" description="Try adjusting your filters or create a new ticket." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="table-header">
                  <tr>
                    {canManage && (
                      <th className="td-cell w-10">
                        <button
                          onClick={toggleAll}
                          className="flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                          aria-label={allSelected ? "Deselect all" : "Select all"}
                        >
                          {allSelected ? (
                            <CheckSquare className="h-4 w-4 text-brand-600" />
                          ) : someSelected ? (
                            <span className="flex h-4 w-4 items-center justify-center rounded border-2 border-brand-400">
                              <span className="h-1.5 w-2.5 rounded-sm bg-brand-400" />
                            </span>
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </th>
                    )}
                    <th className="td-cell w-24">#</th>
                    <th className="td-cell">Subject</th>
                    <th className="td-cell hidden md:table-cell">Customer</th>
                    <th className="td-cell">Status</th>
                    <th className="td-cell hidden sm:table-cell">Priority</th>
                    <th className="td-cell hidden lg:table-cell">Updated</th>
                    <th className="td-cell w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((t: TicketListItem) => {
                    const isSelected = selectedIds.includes(t.id);
                    return (
                      <tr
                        key={t.id}
                        className={`table-row ${isSelected ? "bg-brand-50/60 dark:bg-brand-900/10" : ""}`}
                      >
                        {canManage && (
                          <td className="td-cell">
                            <button
                              onClick={() => toggleOne(t.id)}
                              className="flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            >
                              {isSelected
                                ? <CheckSquare className="h-4 w-4 text-brand-600" />
                                : <Square className="h-4 w-4" />
                              }
                            </button>
                          </td>
                        )}
                        <td className="td-cell">
                          <span className="font-mono text-[11px] font-semibold text-slate-400">{t.number}</span>
                        </td>
                        <td className="td-cell">
                          <p className="line-clamp-1 max-w-xs font-semibold text-slate-800 dark:text-slate-100">{t.subject}</p>
                        </td>
                        <td className="td-cell hidden text-slate-500 md:table-cell">{t.customer.full_name}</td>
                        <td className="td-cell">
                          {canManage ? (
                            <InlineStatusSelect current={t.status} ticketId={t.id} onChanged={tickets.refetch} />
                          ) : (
                            <StatusBadge status={t.status} />
                          )}
                        </td>
                        <td className="td-cell hidden sm:table-cell">
                          <PriorityBadge priority={t.priority} />
                        </td>
                        <td className="td-cell hidden text-xs text-slate-400 lg:table-cell">{relativeTime(t.updated_at)}</td>
                        <td className="td-cell">
                          <Link
                            to={`/tickets/${t.id}`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-900/20"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {tickets.data && (
              <Pagination
                page={tickets.data.page}
                totalPages={tickets.data.total_pages}
                total={tickets.data.total}
                pageSize={tickets.data.page_size}
                onPageChange={(p) => setParams((prev) => ({ ...prev, page: p }))}
              />
            )}
          </>
        )}
      </Card>

      {/* Confirm delete dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleBulkDelete}
        title="Close selected tickets"
        message={`Are you sure you want to close ${selectedIds.length} ticket${selectedIds.length !== 1 ? "s" : ""}? Closed tickets cannot be reopened by customers.`}
        confirmText="Yes, close them"
        cancelText="Cancel"
        variant="danger"
        isLoading={isBulkLoading}
      />
    </div>
  );
}