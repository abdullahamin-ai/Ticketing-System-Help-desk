import { api } from "@/lib/api";
import {
  Page,
  UserCreateAdmin,
  UserPasswordUpdate,
  UserRead,
  UserRole,
  UserUpdateAdmin,
} from "@/types";

export interface UserListParams {
  page?: number;
  page_size?: number;
  search?: string;
  role?: UserRole;
  is_active?: boolean;
}

export const userService = {
  async list(params: UserListParams = {}): Promise<Page<UserRead>> {
    const { data } = await api.get<Page<UserRead>>("/users", { params });
    return data;
  },
  async get(id: number): Promise<UserRead> {
    const { data } = await api.get<UserRead>(`/users/${id}`);
    return data;
  },
  async create(payload: UserCreateAdmin): Promise<UserRead> {
    const { data } = await api.post<UserRead>("/users", payload);
    return data;
  },
  async update(id: number, payload: UserUpdateAdmin): Promise<UserRead> {
    const { data } = await api.patch<UserRead>(`/users/${id}`, payload);
    return data;
  },
  async resetPassword(id: number, payload: UserPasswordUpdate): Promise<void> {
    await api.post(`/users/${id}/password`, payload);
  },
};
