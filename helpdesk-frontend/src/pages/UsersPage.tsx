import { useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { userService, UserListParams } from "@/services/users";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { RoleBadge } from "@/components/ui/Badge";
import { LoadingOverlay, TableSkeleton } from "@/components/ui/Loading";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { BackButton } from "@/components/ui/BackButton";
import { UserRole, UserRead, UserCreateAdmin, UserUpdateAdmin } from "@/types";
import { Search, UserPlus, Edit3, KeyRound } from "lucide-react";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/utils";

export function UsersPage() {
  const [params, setParams] = useState<UserListParams>({ page: 1, page_size: 20 });
  const [search, setSearch] = useState("");
  const users = useApi(() => userService.list(params), [params]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<UserRead | null>(null);
  const [resetting, setResetting] = useState<UserRead | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setParams((p) => ({ ...p, search: search || undefined, page: 1 }));
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="space-y-6">
      <BackButton />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">{users.data?.total ?? 0} user(s)</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus className="h-4 w-4" /> New user
        </Button>
      </div>

      <Card>
        <CardBody>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9" placeholder="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select
              value={params.role ?? ""}
              onChange={(e) => setParams((p) => ({ ...p, role: (e.target.value as UserRole) || undefined, page: 1 }))}
              options={[
                { value: "", label: "All roles" },
                { value: "ADMIN", label: "Admin" },
                { value: "AGENT", label: "Agent" },
                { value: "CUSTOMER", label: "Customer" },
              ]}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>User list</CardTitle></CardHeader>
        {users.isLoading ? (
          <div className="p-4"><TableSkeleton /></div>
        ) : users.error ? (
          <ErrorState onRetry={users.refetch} />
        ) : users.data && users.data.items.length === 0 ? (
          <EmptyState title="No users found" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="table-header">
                  <tr>
                    <th className="td-cell">User</th>
                    <th className="td-cell">Role</th>
                    <th className="td-cell">Status</th>
                    <th className="td-cell hidden md:table-cell">Created</th>
                    <th className="td-cell hidden lg:table-cell">Last login</th>
                    <th className="td-cell w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.data?.items.map((u) => (
                    <tr key={u.id} className="table-row">
                      <td className="td-cell">
                        <p className="font-medium">{u.full_name}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </td>
                      <td className="td-cell"><RoleBadge role={u.role} /></td>
                      <td className="td-cell">
                        <span className={`badge ${u.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="td-cell hidden text-xs text-slate-500 md:table-cell">{formatDate(u.created_at)}</td>
                      <td className="td-cell hidden text-xs text-slate-500 lg:table-cell">{u.last_login_at ? formatDate(u.last_login_at) : "Never"}</td>
                      <td className="td-cell">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setEditing(u)} className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-700" title="Edit">
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button onClick={() => setResetting(u)} className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-700" title="Reset password">
                            <KeyRound className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {users.data && (
              <Pagination
                page={users.data.page}
                totalPages={users.data.total_pages}
                total={users.data.total}
                pageSize={users.data.page_size}
                onPageChange={(p) => setParams((prev) => ({ ...prev, page: p }))}
              />
            )}
          </>
        )}
      </Card>

      {createOpen && <CreateUserModal onClose={() => setCreateOpen(false)} onCreated={() => { users.refetch(); setCreateOpen(false); }} />}
      {editing && <EditUserModal user={editing} onClose={() => setEditing(null)} onSaved={() => { users.refetch(); setEditing(null); }} />}
      {resetting && <ResetPasswordModal user={resetting} onClose={() => setResetting(null)} onSaved={() => setResetting(null)} />}
    </div>
  );
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<UserCreateAdmin>({ email: "", password: "", full_name: "", role: "CUSTOMER", is_active: true });
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await userService.create(form);
      toast.success("User created.");
      onCreated();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to create user.");
    } finally { setSaving(false); }
  };

  return (
    <Modal open onClose={onClose} title="Create user">
      <form onSubmit={onSubmit} className="space-y-3">
        <Input label="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
        <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
        <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
          options={[{ value: "CUSTOMER", label: "Customer" }, { value: "AGENT", label: "Agent" }, { value: "ADMIN", label: "Admin" }]} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 rounded" />
          Active
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={saving}>Create</Button>
        </div>
      </form>
    </Modal>
  );
}

function EditUserModal({ user, onClose, onSaved }: { user: UserRead; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<UserUpdateAdmin>({ full_name: user.full_name, role: user.role, is_active: user.is_active });
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await userService.update(user.id, form);
      toast.success("User updated.");
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to update user.");
    } finally { setSaving(false); }
  };

  return (
    <Modal open onClose={onClose} title={`Edit ${user.full_name}`}>
      <form onSubmit={onSubmit} className="space-y-3">
        <Input label="Full name" value={form.full_name ?? ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
          options={[{ value: "CUSTOMER", label: "Customer" }, { value: "AGENT", label: "Agent" }, { value: "ADMIN", label: "Admin" }]} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.is_active ?? true} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 rounded" />
          Active
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={saving}>Save</Button>
        </div>
      </form>
    </Modal>
  );
}

function ResetPasswordModal({ user, onClose, onSaved }: { user: UserRead; onClose: () => void; onSaved: () => void }) {
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await userService.resetPassword(user.id, { new_password: password });
      toast.success("Password reset.");
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to reset password.");
    } finally { setSaving(false); }
  };

  return (
    <Modal open onClose={onClose} title={`Reset password for ${user.full_name}`} size="sm">
      <form onSubmit={onSubmit} className="space-y-3">
        <Input label="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={saving}>Reset</Button>
        </div>
      </form>
    </Modal>
  );
}