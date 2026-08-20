import { api } from "@/lib/api";

export const attachmentService = {
  async download(id: number): Promise<Blob> {
    const { data } = await api.get(`/attachments/${id}`, {
      responseType: "blob",
    });
    return data;
  },
  async delete(id: number): Promise<void> {
    await api.delete(`/attachments/${id}`);
  },
};
