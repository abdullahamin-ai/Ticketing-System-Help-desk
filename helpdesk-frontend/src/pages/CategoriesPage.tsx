import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { categoryService } from "@/services/categories";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { LoadingOverlay } from "@/components/ui/Loading";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { BackButton } from "@/components/ui/BackButton";
import { CategoryRead, CategoryCreate, CategoryUpdate } from "@/types";
import { Plus, Edit3, Trash2, Tags } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import toast from "react-hot-toast";

export function CategoriesPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "ADMIN";
  const categories = useApi(() => categoryService.list({ page_size: 100 }), []);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CategoryRead | null>(null);

  return (
    <div className="space-y-6">
      <BackButton />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Categories</h1>
          <p className="page-subtitle">Organize tickets by topic</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New category
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All categories</CardTitle>
        </CardHeader>
        {categories.isLoading ? (
          <LoadingOverlay />
        ) : categories.error ? (
          <ErrorState onRetry={categories.refetch} />
        ) : categories.data && categories.data.items.length === 0 ? (
          <EmptyState icon={<Tags className="h-10 w-10" />} title="No categories yet" />
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {categories.data?.items.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.slug}</p>
                  {c.description && (
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{c.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${c.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>
                    {c.is_active ? "Active" : "Inactive"}
                  </span>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => setEditing(c)}
                        className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-700"
                        title="Edit"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`Delete "${c.name}"?`)) return;
                          try {
                            await categoryService.delete(c.id);
                            toast.success("Category deleted.");
                            categories.refetch();
                          } catch (err: any) {
                            toast.error(err?.response?.data?.detail || "Failed to delete.");
                          }
                        }}
                        className="rounded p-1 text-red-500 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/40"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {creating && (
        <CategoryFormModal
          onClose={() => setCreating(false)}
          onSaved={() => {
            categories.refetch();
            setCreating(false);
          }}
        />
      )}
      {editing && (
        <CategoryFormModal
          category={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            categories.refetch();
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function CategoryFormModal({
  category,
  onClose,
  onSaved,
}: {
  category?: CategoryRead;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!category;
  const [form, setForm] = useState<CategoryCreate | CategoryUpdate>(
    isEdit
      ? { name: category!.name, description: category!.description ?? undefined, is_active: category!.is_active }
      : { name: "", slug: "", description: "", is_active: true }
  );
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await categoryService.update(category!.id, form as CategoryUpdate);
      } else {
        await categoryService.create(form as CategoryCreate);
      }
      toast.success(isEdit ? "Category updated." : "Category created.");
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to save category.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={isEdit ? "Edit category" : "New category"}>
      <form onSubmit={onSubmit} className="space-y-3">
        <Input
          label="Name"
          value={(form as any).name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        {!isEdit && (
          <Input
            label="Slug"
            value={(form as any).slug ?? ""}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            required
            pattern="^[a-z0-9-]+$"
            placeholder="e.g. billing"
          />
        )}
        <Textarea
          label="Description"
          value={(form as any).description ?? ""}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!(form as any).is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            className="h-4 w-4 rounded"
          />
          Active
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={saving}>{isEdit ? "Save" : "Create"}</Button>
        </div>
      </form>
    </Modal>
  );
}