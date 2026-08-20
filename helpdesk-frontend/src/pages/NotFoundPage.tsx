import { Link } from "react-router-dom";
import { Compass } from "lucide-react";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
      <div className="text-center">
        <Compass className="mx-auto h-16 w-16 text-slate-400" />
        <h1 className="mt-4 text-3xl font-bold">404</h1>
        <p className="mt-2 text-slate-500">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link to="/dashboard" className="btn-primary mt-6 inline-flex">
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
