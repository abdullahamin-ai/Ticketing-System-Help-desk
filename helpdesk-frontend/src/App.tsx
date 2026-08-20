import { useEffect } from "react";
import { AppRoutes } from "@/components/AppRoutes";
import { useAuthStore } from "@/store/auth";

export default function App() {
  const fetchMe = useAuthStore((s) => s.fetchMe);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  return <AppRoutes />;
}