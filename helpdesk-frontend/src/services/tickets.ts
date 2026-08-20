import { api } from "@/lib/api";
import {
  Page,
  TicketAssign,
  TicketCreate,
  TicketListItem,
  TicketRead,
  TicketStatusUpdate,
  TicketUpdate,
  TicketPriority,
  TicketStatus,
} from "@/types";

export interface TicketListParams {
  page?: number;
  page_size?: number;
  status?: TicketStatus;
  priority?: TicketPriority;
  category_id?: number;
  agent_id?: number;
  customer_id?: number;
  search?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: "created_at" | "updated_at" | "priority" | "status" | "number";
  sort_dir?: "asc" | "desc";
}

export const ticketService = {
  async list(params: TicketListParams = {}): Promise<Page<TicketListItem>> {
    const { data } = await api.get<Page<TicketListItem>>("/tickets", {
      params,
    });
    return data;
  },
  async get(id: number): Promise<TicketRead> {
    const { data } = await api.get<TicketRead>(`/tickets/${id}`);
    return data;
  },
  async create(payload: TicketCreate): Promise<TicketRead> {
    const { data } = await api.post<TicketRead>("/tickets", payload);
    return data;
  },
  async update(id: number, payload: TicketUpdate): Promise<TicketRead> {
    const { data } = await api.patch<TicketRead>(`/tickets/${id}`, payload);
    return data;
  },
  async assign(id: number, payload: TicketAssign): Promise<TicketRead> {
    const { data } = await api.post<TicketRead>(
      `/tickets/${id}/assign`,
      payload
    );
    return data;
  },
  async changeStatus(
    id: number,
    payload: TicketStatusUpdate
  ): Promise<TicketRead> {
    const { data } = await api.post<TicketRead>(
      `/tickets/${id}/status`,
      payload
    );
    return data;
  },
  async close(id: number): Promise<TicketRead> {
    const { data } = await api.post<TicketRead>(`/tickets/${id}/close`);
    return data;
  },
};
