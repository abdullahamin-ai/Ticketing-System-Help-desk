import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { ticketService } from "@/services/tickets";
import { messageService } from "@/services/messages";
import { categoryService } from "@/services/categories";
import { userService } from "@/services/users";
import { useAuthStore } from "@/store/auth";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { StatusBadge, PriorityBadge, RoleBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { LoadingOverlay } from "@/components/ui/Loading";
import { ErrorState } from "@/components/ui/ErrorState";
import { AttachmentList } from "@/components/AttachmentList";
import {
  ArrowLeft,
  Send,
  Paperclip,
  Lock,
  Trash2,
  UserPlus,
  Edit3,
} from "lucide-react";
import {
  CategoryRead,
  MessageRead,
  TicketPriority,
  TicketRead,
  TicketStatus,
  UserMinimal,
  UserRead,
} from "@/types";
import toast from "react-hot-toast";
import { formatDate, relativeTime } from "@/lib/utils";

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const ticketId = Number(id);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const ticket = useApi<TicketRead | null>(
    () => (ticketId ? ticketService.get(ticketId) : Promise.reject("No id")),
    [ticketId]
  );

  const messages = useApi<MessageRead[]>(
    () => messageService.list(ticketId),
    [ticketId]
  );

  if (ticket.isLoading) return <LoadingOverlay />;
  if (ticket.error || !ticket.data) {
    const status = (ticket.error as { response?: { status?: number } })?.response?.status;
    const message =
      status === 403
        ? "This ticket is no longer assigned to you (it may have been reassigned or closed)."
        : status === 404
        ? "This ticket doesn't exist."
        : "Ticket not found or you don't have access.";
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <ErrorState message={message} onRetry={ticket.refetch} />
      </div>
    );
  }

  const t = ticket.data;
  const isCustomer = user?.role === "CUSTOMER";
  const isAgent = user?.role === "AGENT";
  const isAdmin = user?.role === "ADMIN";

  const canEdit = isAdmin || (isAgent && t.agent?.id === user?.id) || (isCustomer && t.status === "OPEN");
  const canReply = isAdmin || (isAgent && t.agent?.id === user?.id) || (isCustomer && t.customer.id === user?.id && t.status !== "CLOSED");
  const canClose = t.status === "RESOLVED" && (isAdmin || (isAgent && t.agent?.id === user?.id) || (isCustomer && t.customer.id === user?.id));

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-3">
          <ArrowLeft className="h-4 w-4" /> Back to tickets
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-slate-500">{t.number}</p>
            <h1 className="mt-1 text-2xl font-bold">{t.subject}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={t.status} />
              <PriorityBadge priority={t.priority} />
              <span className="text-xs text-slate-500">
                Created {relativeTime(t.created_at)} by {t.customer.full_name}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {isAdmin && <AssignButton ticket={t} onAssigned={ticket.refetch} />}
            {(isAdmin || isAgent) && (
              <StatusButton ticket={t} onChanged={ticket.refetch} disabled={!canReply && !canClose} />
            )}
            {canClose && (
              <Button
                variant="primary"
                onClick={async () => {
                  try {
                    await ticketService.close(t.id);
                    toast.success("Ticket closed.");
                    ticket.refetch();
                  } catch (e) {
                    toast.error("Failed to close ticket.");
                  }
                }}
              >
                Close ticket
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardBody>
              <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
                {t.description}
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conversation</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              {messages.isLoading ? (
                <LoadingOverlay />
              ) : (
                <>
                  {(messages.data ?? []).map((m) => (
                    <MessageBubble
                      key={m.id}
                      message={m}
                      ticketId={t.id}
                      canEdit={
                        isAdmin || (!!user && m.author.id === user.id)
                      }
                      onChange={() => {
                        messages.refetch();
                        ticket.refetch();
                      }}
                    />
                  ))}
                  {messages.data && messages.data.length === 0 && (
                    <p className="text-center text-sm text-slate-500">
                      No messages yet — start the conversation below.
                    </p>
                  )}
                </>
              )}
              {canReply && (
                <ReplyBox
                  ticketId={t.id}
                  isAgent={isAgent}
                  isAdmin={isAdmin}
                  onSent={() => {
                    messages.refetch();
                    ticket.refetch();
                  }}
                />
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm">
              <div>
                <p className="text-slate-500">Customer</p>
                <p className="font-medium">{t.customer.full_name}</p>
                <p className="text-xs text-slate-500">{t.customer.email}</p>
              </div>
              <div>
                <p className="text-slate-500">Assigned agent</p>
                {t.agent ? (
                  <>
                    <p className="font-medium">{t.agent.full_name}</p>
                    <p className="text-xs text-slate-500">{t.agent.email}</p>
                  </>
                ) : (
                  <p className="italic text-slate-400">Unassigned</p>
                )}
              </div>
              <div>
                <p className="text-slate-500">Resolved</p>
                <p>{t.resolved_at ? formatDate(t.resolved_at) : "—"}</p>
              </div>
              <div>
                <p className="text-slate-500">Closed</p>
                <p>{t.closed_at ? formatDate(t.closed_at) : "—"}</p>
              </div>
            </CardBody>
          </Card>

          {canEdit && (
            <EditTicketCard ticket={t} onUpdated={ticket.refetch} />
          )}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  ticketId,
  canEdit,
  onChange,
}: {
  message: MessageRead;
  ticketId: number;
  canEdit: boolean;
  onChange: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(message.body);

  const handleDelete = async () => {
    if (!confirm("Delete this message?")) return;
    try {
      await messageService.delete(ticketId, message.id);
      toast.success("Message deleted.");
      onChange();
    } catch {
      toast.error("Failed to delete message.");
    }
  };

  const handleSave = async () => {
    try {
      await messageService.update(ticketId, message.id, body);
      toast.success("Message updated.");
      setEditing(false);
      onChange();
    } catch {
      toast.error("Failed to update message.");
    }
  };

  const isInternal = message.is_internal_note;

  return (
    <div
      className={`rounded-lg border p-4 ${
        isInternal
          ? "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/10"
          : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50"
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold dark:bg-slate-700">
            {message.author.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium">{message.author.full_name}</p>
            <p className="text-xs text-slate-500">
              <RoleBadge role={message.author.role} /> · {relativeTime(message.created_at)}
            </p>
          </div>
        </div>
        {isInternal && (
          <span className="badge bg-amber-200 text-amber-800 dark:bg-amber-800/60 dark:text-amber-200">
            <Lock className="mr-1 h-3 w-3" />
            Internal note
          </span>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
          {message.body}
        </p>
      )}

      {message.attachments && message.attachments.length > 0 && (
        <div className="mt-3">
          <AttachmentList
            ticketId={ticketId}
            attachments={message.attachments}
            allowDelete={canEdit}
            onDelete={onChange}
          />
        </div>
      )}

      {canEdit && !editing && (
        <div className="mt-2 flex justify-end gap-1">
          <button
            onClick={() => setEditing(true)}
            className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-700"
            title="Edit"
          >
            <Edit3 className="h-4 w-4" />
          </button>
          <button
            onClick={handleDelete}
            className="rounded p-1 text-red-500 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/40"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function ReplyBox({
  ticketId,
  isAgent,
  isAdmin,
  onSent,
}: {
  ticketId: number;
  isAgent: boolean;
  isAdmin: boolean;
  onSent: () => void;
}) {
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      await messageService.create(ticketId, {
        body,
        is_internal_note: isInternal,
        files: files.length ? files : undefined,
      });
      setBody("");
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success(isInternal ? "Internal note added." : "Reply sent.");
      onSent();
    } catch {
      toast.error("Failed to send message.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <Textarea
        placeholder="Write a reply..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        required
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="hidden"
            id="file-input"
          />
          <label htmlFor="file-input" className="btn-ghost cursor-pointer">
            <Paperclip className="h-4 w-4" />
            {files.length > 0 ? `${files.length} file(s)` : "Attach"}
          </label>
          {(isAgent || isAdmin) && (
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Internal note
            </label>
          )}
        </div>
        <Button type="submit" isLoading={submitting} disabled={!body.trim()}>
          <Send className="h-4 w-4" />
          {isInternal ? "Add note" : "Send reply"}
        </Button>
      </div>
    </form>
  );
}

function AssignButton({ ticket, onAssigned }: { ticket: TicketRead; onAssigned: () => void }) {
  const [open, setOpen] = useState(false);
  const [agents, setAgents] = useState<UserRead[]>([]);
  const [selected, setSelected] = useState<string>(ticket.agent?.id?.toString() ?? "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      userService.list({ role: "AGENT", page_size: 100 }).then((p) => {
        setAgents(p.items);
      });
    }
  }, [open]);

  const handleAssign = async () => {
    setLoading(true);
    try {
      await ticketService.assign(ticket.id, {
        agent_id: selected ? Number(selected) : null,
      });
      toast.success(selected ? "Ticket assigned." : "Ticket unassigned.");
      setOpen(false);
      onAssigned();
    } catch {
      toast.error("Failed to assign ticket.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" />
        {ticket.agent?.id ? "Reassign" : "Assign"}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Assign ticket" size="sm">
        <Select
          label="Agent"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          options={[
            { value: "", label: "Unassigned" },
            ...agents.map((a) => ({ value: a.id.toString(), label: `${a.full_name} (${a.email})` })),
          ]}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleAssign} isLoading={loading}>Save</Button>
        </div>
      </Modal>
    </>
  );
}

function StatusButton({ ticket, onChanged, disabled }: { ticket: TicketRead; onChanged: () => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await ticketService.changeStatus(ticket.id, { status, note: note || undefined });
      toast.success("Status updated.");
      setOpen(false);
      setNote("");
      onChanged();
    } catch (err) {
      toast.error("Failed to update status.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} disabled={disabled}>
        Change status
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Update status" size="sm">
        <Select
          label="New status"
          value={status}
          onChange={(e) => setStatus(e.target.value as TicketStatus)}
          options={[
            { value: "OPEN", label: "Open" },
            { value: "IN_PROGRESS", label: "In progress" },
            { value: "WAITING_FOR_CUSTOMER", label: "Waiting for customer" },
            { value: "RESOLVED", label: "Resolved" },
            { value: "CLOSED", label: "Closed" },
          ]}
        />
        <Textarea
          label="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Reason for the change..."
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} isLoading={loading}>Update</Button>
        </div>
      </Modal>
    </>
  );
}

function EditTicketCard({ ticket, onUpdated }: { ticket: TicketRead; onUpdated: () => void }) {
  const categories = useApi<CategoryRead[]>(
    () => categoryService.list({ page_size: 200 }).then((p) => p.items),
    []
  );
  const [form, setForm] = useState({
    subject: ticket.subject,
    description: ticket.description,
    priority: ticket.priority,
    category_id: ticket.category_id?.toString() ?? "",
  });
  const [saving, setSaving] = useState(false);

  const handle = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const onSave = async () => {
    setSaving(true);
    try {
      await ticketService.update(ticket.id, {
        subject: form.subject,
        description: form.description,
        priority: form.priority as TicketPriority,
        category_id: form.category_id ? Number(form.category_id) : null,
      });
      toast.success("Ticket updated.");
      onUpdated();
    } catch {
      toast.error("Failed to update ticket.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit ticket</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        <Input label="Subject" value={form.subject} onChange={handle("subject")} />
        <Textarea label="Description" value={form.description} onChange={handle("description")} rows={4} />
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
          label="Category"
          value={form.category_id}
          onChange={handle("category_id")}
          options={[
            { value: "", label: "None" },
            ...(categories.data ?? []).map((c) => ({
              value: c.id.toString(),
              label: c.name,
            })),
          ]}
        />
        <Button onClick={onSave} isLoading={saving} className="w-full">
          Save changes
        </Button>
      </CardBody>
    </Card>
  );
}