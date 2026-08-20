import { create } from "zustand";
import { notificationService } from "@/services/notifications";

interface NotificationsState {
  unreadCount: number;
  refresh: () => Promise<void>;
  setUnreadCount: (n: number) => void;
}

/** Shared unread-notification count. The header bell and the notifications
 * page both read/update this, so marking notifications as read (individually
 * or all at once) updates the bell badge immediately instead of waiting for
 * the next poll interval. */
export const useNotificationsStore = create<NotificationsState>((set) => ({
  unreadCount: 0,
  setUnreadCount: (n) => set({ unreadCount: Math.max(0, n) }),
  refresh: async () => {
    try {
      const count = await notificationService.unreadCount();
      set({ unreadCount: count });
    } catch {
      /* ignore - keep last known count */
    }
  },
}));