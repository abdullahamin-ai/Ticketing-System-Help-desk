import { Download, Trash2, FileText } from "lucide-react";
import { attachmentService } from "@/services/attachments";
import { useAuthStore } from "@/store/auth";
import { AttachmentRead } from "@/types";
import { formatBytes } from "@/lib/utils";
import toast from "react-hot-toast";

interface Props {
  ticketId: number;
  attachments: AttachmentRead[];
  onDelete?: (id: number) => void;
  allowDelete?: boolean;
}

export function AttachmentList({ attachments, onDelete, allowDelete }: Props) {
  const user = useAuthStore((s) => s.user);

  const handleDownload = async (att: AttachmentRead) => {
    try {
      const blob = await attachmentService.download(att.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = att.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download file.");
    }
  };

  const handleDelete = async (att: AttachmentRead) => {
    if (!confirm(`Delete ${att.filename}?`)) return;
    try {
      await attachmentService.delete(att.id);
      toast.success("Attachment deleted.");
      onDelete?.(att.id);
    } catch {
      toast.error("Failed to delete attachment.");
    }
  };

  if (attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {attachments.map((att) => {
        const canDelete =
          allowDelete && (user?.role === "ADMIN" || att.uploader_id === user?.id);
        return (
          <div
            key={att.id}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <FileText className="h-4 w-4 text-slate-500" />
            <div className="flex flex-col">
              <span className="font-medium">{att.filename}</span>
              <span className="text-xs text-slate-500">
                {formatBytes(att.size_bytes)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleDownload(att)}
              className="ml-2 rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-700"
              title="Download"
            >
              <Download className="h-4 w-4" />
            </button>
            {canDelete && (
              <button
                type="button"
                onClick={() => handleDelete(att)}
                className="rounded p-1 text-red-500 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/40"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
