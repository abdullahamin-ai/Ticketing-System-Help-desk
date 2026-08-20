import { useState } from "react";
import { useAuthStore } from "@/store/auth";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { RoleBadge } from "@/components/ui/Badge";
import { BackButton } from "@/components/ui/BackButton";
import { authService } from "@/services/auth";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.new_password !== form.confirm) { toast.error("Passwords do not match."); return; }
    if (form.new_password.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    setSaving(true);
    try {
      await authService.changeMyPassword(form.current_password, form.new_password);
      toast.success("Password updated.");
      setForm({ current_password: "", new_password: "", confirm: "" });
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to update password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <BackButton />
      <div>
        <h1 className="page-title">Profile</h1>
        <p className="page-subtitle">Manage your account</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardBody className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <h2 className="mt-4 text-xl font-semibold">{user.full_name}</h2>
            <p className="text-sm text-slate-500">{user.email}</p>
            <div className="mt-3"><RoleBadge role={user.role} /></div>
            <div className="mt-4 w-full border-t border-slate-200 pt-4 text-left text-sm dark:border-slate-800">
              <p className="flex justify-between py-1">
                <span className="text-slate-500">Status</span>
                <span className="font-medium">{user.is_active ? "Active" : "Inactive"}</span>
              </p>
              <p className="flex justify-between py-1">
                <span className="text-slate-500">Joined</span>
                <span className="font-medium">{formatDate(user.created_at)}</span>
              </p>
              <p className="flex justify-between py-1">
                <span className="text-slate-500">Last login</span>
                <span className="font-medium">{user.last_login_at ? formatDate(user.last_login_at) : "Never"}</span>
              </p>
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Change password</CardTitle></CardHeader>
          <CardBody>
            <form onSubmit={onSubmit} className="space-y-3">
              <Input type="password" label="Current password" value={form.current_password} onChange={(e) => setForm({ ...form, current_password: e.target.value })} required />
              <Input type="password" label="New password" value={form.new_password} onChange={(e) => setForm({ ...form, new_password: e.target.value })} required minLength={8} />
              <Input type="password" label="Confirm new password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required minLength={8} />
              <Button type="submit" isLoading={saving}>Update password</Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}