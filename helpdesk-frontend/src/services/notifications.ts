import { api } from "@/lib/api";
import { NotificationRead, Page } from "@/types";

export const notificationService = {
  async list(params: {
    page?: number;
    page_size?: number;
    unread_only?: boolean;
  } = {}): Promise<Page<NotificationRead>> {
    const { data } = await api.get<Page<NotificationRead>>("/notifications", {
      params,
    });
    return data;
  },
  async unreadCount(): Promise<number> {
    const { data } = await api.get<{ unread: number }>(
      "/notifications/unread-count"
    );
    return data.unread;
  },
  async markRead(ids?: number[]): Promise<void> {
    await api.post("/notifications/mark-read", { ids: ids ?? null });
  },
};
