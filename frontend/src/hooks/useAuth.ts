import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getMe } from "@/lib/api";

export function useAuth() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const token = localStorage.getItem("token");

  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await getMe()).data,
    enabled: !!token,
    retry: false,
  });

  const logout = () => {
    localStorage.removeItem("token");
    queryClient.clear();
    navigate("/login", { replace: true });
  };

  return { user, isLoading, isAuthenticated: !!token && !!user, logout };
}
