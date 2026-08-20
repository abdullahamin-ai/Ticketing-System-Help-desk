import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { notificationService } from "@/services/notifications";
import { useNotificationsStore } from "@/store/notifications";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingOverlay } from "@/components/ui/Loading";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { BackButton } from "@/components/ui/BackButton";
import { Bell, CheckCheck, Ticket as TicketIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { relativeTime } from "@/lib/utils";
import toast from "react-hot-toast";

export function NotificationsPage() {
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const notifications = useApi(() => notificationService.list({ page, page_size: 20 }), [page]);
  const refreshUnread = useNotificationsStore((s) => s.refresh);

  const handleMarkAll = async () => {
    try {
      await notificationService.markRead();
      toast.success("All notifications marked as read.");
      notifications.refetch();
      refreshUnread();
    } catch {
      toast.error("Failed to update notifications.");
    }
  };

  const handleView = async (n: { id: number; ticket_id: number | null; is_read: boolean }) => {
    if (!n.ticket_id) return;
    if (!n.is_read) {
      // Mark this one as read before navigating so the bell badge and this
      // list reflect it immediately, instead of waiting on the next poll.
      try {
        await notificationService.markRead([n.id]);
        if (notifications.data) {
          notifications.setData({
            ...notifications.data,
            items: notifications.data.items.map((item) =>
              item.id === n.id ? { ...item, is_read: true } : item
            ),
          });
        }
        refreshUnread();
      } catch {
        /* non-blocking - still navigate even if marking read failed */
      }
    }
    navigate(`/tickets/${n.ticket_id}`);
  };

  return (
    <div className="space-y-6">
      <BackButton />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">Stay updated on ticket activity</p>
        </div>
        <Button variant="secondary" onClick={handleMarkAll}>
          <CheckCheck className="h-4 w-4" /> Mark all as read
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent</CardTitle></CardHeader>
        {notifications.isLoading ? (
          <LoadingOverlay />
        ) : notifications.error ? (
          <ErrorState onRetry={notifications.refetch} />
        ) : notifications.data && notifications.data.items.length === 0 ? (
          <EmptyState icon={<Bell className="h-10 w-10" />} title="No notifications" />
        ) : (
          <>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {notifications.data?.items.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-5 py-3 transition ${!n.is_read ? "bg-brand-50/50 dark:bg-brand-900/10" : ""}`}
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                    <TicketIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{n.title}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{n.body}</p>
                    <p className="mt-1 text-xs text-slate-500">{relativeTime(n.created_at)}</p>
                  </div>
                  {n.ticket_id && (
                    <button
                      onClick={() => handleView(n)}
                      className="btn-ghost text-sm"
                    >
                      View
                    </button>
                  )}
                </div>
              ))}
            </div>
            {notifications.data && (
              <Pagination
                page={notifications.data.page}
                totalPages={notifications.data.total_pages}
                total={notifications.data.total}
                pageSize={notifications.data.page_size}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </Card>
    </div>
  );
}