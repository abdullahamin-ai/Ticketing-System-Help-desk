import { api } from "@/lib/api";
import { AttachmentRead, MessageRead } from "@/types";

export interface CreateMessagePayload {
  body: string;
  is_internal_note?: boolean;
  files?: File[];
}

export const messageService = {
  async list(ticketId: number): Promise<MessageRead[]> {
    const { data } = await api.get<MessageRead[]>(
      `/tickets/${ticketId}/messages`
    );
    return data;
  },
  async create(
    ticketId: number,
    payload: CreateMessagePayload
  ): Promise<MessageRead> {
    const form = new FormData();
    form.append("body", payload.body);
    form.append("is_internal_note", String(!!payload.is_internal_note));
    if (payload.files) {
      payload.files.forEach((f) => form.append("files", f));
    }
    const { data } = await api.post<MessageRead>(
      `/tickets/${ticketId}/messages`,
      form,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return data;
  },
  async update(
    ticketId: number,
    messageId: number,
    body: string
  ): Promise<MessageRead> {
    const { data } = await api.patch<MessageRead>(
      `/tickets/${ticketId}/messages/${messageId}`,
      { body }
    );
    return data;
  },
  async delete(ticketId: number, messageId: number): Promise<void> {
    await api.delete(`/tickets/${ticketId}/messages/${messageId}`);
  },
  async getAttachments(ticketId: number): Promise<AttachmentRead[]> {
    const { data } = await api.get<AttachmentRead[]>(
      `/tickets/${ticketId}/attachments`
    );
    return data;
  },
};
