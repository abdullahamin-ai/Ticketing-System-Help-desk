// Mirror backend enums and schemas exactly.

export type UserRole = "ADMIN" | "AGENT" | "CUSTOMER";

export type TicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_FOR_CUSTOMER"
  | "RESOLVED"
  | "CLOSED";

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type NotificationType =
  | "TICKET_CREATED"
  | "TICKET_ASSIGNED"
  | "TICKET_REPLIED"
  | "TICKET_STATUS_CHANGED"
  | "TICKET_RESOLVED"
  | "TICKET_CLOSED";

export type AuditAction =
  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_DEACTIVATED"
  | "USER_ACTIVATED"
  | "ROLE_CHANGED"
  | "CATEGORY_CREATED"
  | "CATEGORY_UPDATED"
  | "CATEGORY_DELETED"
  | "TICKET_CREATED"
  | "TICKET_UPDATED"
  | "TICKET_ASSIGNED"
  | "TICKET_STATUS_CHANGED"
  | "TICKET_CLOSED";

export interface UserMinimal {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
}

export interface UserRead {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export interface UserCreateAdmin {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  is_active?: boolean;
}

export interface UserUpdateAdmin {
  full_name?: string;
  role?: UserRole;
  is_active?: boolean;
}

export interface UserPasswordUpdate {
  new_password: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
}

export interface CategoryRead {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryCreate {
  name: string;
  slug: string;
  description?: string;
  is_active?: boolean;
}

export interface CategoryUpdate {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface AttachmentRead {
  id: number;
  filename: string;
  content_type: string;
  size_bytes: number;
  ticket_id: number;
  message_id: number | null;
  uploader_id: number;
  created_at: string;
}

export interface MessageRead {
  id: number;
  ticket_id: number;
  body: string;
  is_internal_note: boolean;
  author: UserMinimal;
  attachments: AttachmentRead[];
  created_at: string;
  updated_at: string;
}

export interface TicketRead {
  id: number;
  number: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  customer: UserMinimal;
  agent: UserMinimal | null;
  category_id: number | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
}

export interface TicketListItem {
  id: number;
  number: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  customer: UserMinimal;
  agent: UserMinimal | null;
  category_id: number | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
}

export interface TicketCreate {
  subject: string;
  description: string;
  priority: TicketPriority;
  category_id?: number | null;
}

export interface TicketUpdate {
  subject?: string;
  description?: string;
  priority?: TicketPriority;
  category_id?: number | null;
}

export interface TicketStatusUpdate {
  status: TicketStatus;
  note?: string;
}

export interface TicketAssign {
  agent_id?: number | null;
}

export interface NotificationRead {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  ticket_id: number | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AnalyticsResponse {
  total_tickets: number;
  open: number;
  in_progress: number;
  waiting_for_customer: number;
  resolved: number;
  closed: number;
  average_resolution_hours: number | null;
  by_priority: { priority: TicketPriority; count: number }[];
  by_category: {
    category_id: number | null;
    category_name: string | null;
    count: number;
  }[];
  by_agent: {
    agent_id: number | null;
    agent_name: string | null;
    count: number;
  }[];
}

export interface AuditLogRead {
  id: number;
  actor: UserMinimal | null;
  action: AuditAction;
  entity_type: string;
  entity_id: number | null;
  extra_data: Record<string, unknown> | null;
  created_at: string;
}

export interface ApiError {
  detail: string;
  code: string;
  details?: unknown;
}