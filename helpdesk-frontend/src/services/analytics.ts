import { api } from "@/lib/api";
import { AnalyticsResponse, AuditLogRead, Page } from "@/types";

export const analyticsService = {
  async summary(): Promise<AnalyticsResponse> {
    const { data } = await api.get<AnalyticsResponse>("/analytics/tickets");
    return data;
  },
};

export const auditService = {
  async list(params: {
    page?: number;
    page_size?: number;
    action?: string;
    actor_id?: number;
    entity_type?: string;
    entity_id?: number;
  } = {}): Promise<Page<AuditLogRead>> {
    const { data } = await api.get<Page<AuditLogRead>>("/admin/audit-logs", {
      params,
    });
    return data;
  },
};
