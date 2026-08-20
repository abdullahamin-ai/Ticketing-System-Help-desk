import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { categoryService } from "@/services/categories";
import { ticketService } from "@/services/tickets";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { BackButton } from "@/components/ui/BackButton";
import { CategoryRead, TicketPriority } from "@/types";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { ApiError } from "@/types";

export function TicketCreatePage() {
  const navigate = useNavigate();
  const categories = useApi<CategoryRead[]>(
    () => categoryService.list({ page_size: 200 }).then((p) => p.items),
    []
  );
  const [form, setForm] = useState({
    subject: "",
    description: "",
    priority: "MEDIUM" as TicketPriority,
    category_id: "" as string,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handle = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);
    try {
      const ticket = await ticketService.create({
        subject: form.subject,
        description: form.description,
        priority: form.priority,
        category_id: form.category_id ? Number(form.category_id) : null,
      });
      toast.success("Ticket created successfully.");
      navigate(`/tickets/${ticket.id}`);
    } catch (err) {
      const e = err as AxiosError<ApiError>;
      if (e.response?.data?.detail) {
        toast.error(e.response.data.detail);
      } else {
        toast.error("Failed to create ticket.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackButton />
      <div>
        <h1 className="page-title">Create new ticket</h1>
        <p className="page-subtitle">Provide as much detail as possible so we can help you faster.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Ticket details</CardTitle></CardHeader>
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-4">
            <Input label="Subject" placeholder="Brief summary of the issue" value={form.subject} onChange={handle("subject")} required minLength={3} maxLength={200} error={errors.subject} />
            <Textarea label="Description" placeholder="Describe the issue in detail..." value={form.description} onChange={handle("description")} required minLength={3} maxLength={20000} rows={8} error={errors.description} />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Select
                label="Priority"
                value={form.priority}
                onChange={handle("priority")}
                options={[
                  { value: "LOW", label: "Low" },
                  { value: "MEDIUM", label: "Medium" },
                  { value: "HIGH", label: "High" },
                  { value: "URGENT", label: "Urgent" },
                ]}
              />
              <Select
                label="Category (optional)"
                value={form.category_id}
                onChange={handle("category_id")}
                options={[
                  { value: "", label: "Select category" },
                  ...(categories.data ?? []).filter((c) => c.is_active).map((c) => ({ value: c.id.toString(), label: c.name })),
                ]}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="submit" isLoading={submitting}>Submit ticket</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}