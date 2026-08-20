import { create } from "zustand";
import { persist } from "zustand/middleware";
import { UserRead, UserRole } from "@/types";
import { api, getAuthToken, setAuthToken } from "@/lib/api";

interface AuthState {
  user: UserRead | null;
  isLoading: boolean;
  isInitialized: boolean;
  setUser: (user: UserRead | null) => void;
  fetchMe: () => Promise<UserRead | null>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, full_name: string) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      isInitialized: false,

      setUser: (user) => set({ user }),

      fetchMe: async () => {
        if (!getAuthToken()) {
          set({ user: null, isInitialized: true, isLoading: false });
          return null;
        }
        set({ isLoading: true });
        try {
          const { data } = await api.get<UserRead>("/users/me");
          set({ user: data, isInitialized: true, isLoading: false });
          return data;
        } catch (e) {
          set({ user: null, isInitialized: true, isLoading: false });
          return null;
        }
      },

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post("/auth/login", { email, password });
          setAuthToken(data.access_token);
          const me = await get().fetchMe();
          if (!me) throw new Error("Failed to fetch profile");
          set({ isLoading: false });
        } catch (e) {
          set({ isLoading: false });
          throw e;
        }
      },

      register: async (email, password, full_name) => {
        set({ isLoading: true });
        try {
          await api.post("/auth/register", { email, password, full_name });
          await get().login(email, password);
        } catch (e) {
          set({ isLoading: false });
          throw e;
        }
      },

      logout: () => {
        setAuthToken(null);
        set({ user: null });
      },

      hasRole: (...roles) => {
        const u = get().user;
        return !!u && roles.includes(u.role);
      },
    }),
    {
      name: "hd_user",
      partialize: (state) => ({ user: state.user }),
    }
  )
);