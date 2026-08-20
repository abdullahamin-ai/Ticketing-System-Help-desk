import { api } from "@/lib/api";
import { CategoryCreate, CategoryRead, CategoryUpdate, Page } from "@/types";

export const categoryService = {
  async list(params: {
    page?: number;
    page_size?: number;
    search?: string;
    is_active?: boolean;
  } = {}): Promise<Page<CategoryRead>> {
    const { data } = await api.get<Page<CategoryRead>>("/categories", {
      params,
    });
    return data;
  },
  async get(id: number): Promise<CategoryRead> {
    const { data } = await api.get<CategoryRead>(`/categories/${id}`);
    return data;
  },
  async create(payload: CategoryCreate): Promise<CategoryRead> {
    const { data } = await api.post<CategoryRead>("/categories", payload);
    return data;
  },
  async update(id: number, payload: CategoryUpdate): Promise<CategoryRead> {
    const { data } = await api.patch<CategoryRead>(
      `/categories/${id}`,
      payload
    );
    return data;
  },
  async delete(id: number): Promise<void> {
    await api.delete(`/categories/${id}`);
  },
};
