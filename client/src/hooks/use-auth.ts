import { useQuery, useQueryClient } from "@tanstack/react-query";

interface AuthStatus {
  authenticated: boolean;
  oauthConfigured: boolean;
  user: {
    email: string;
    name: string;
    picture?: string;
  } | null;
}

export function useAuth() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<AuthStatus>({
    queryKey: ["/api/auth/status"],
    queryFn: async () => {
      const res = await fetch("/api/auth/status", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to check auth status");
      return res.json();
    },
    staleTime: 30_000, // Re-check every 30s
    retry: 1,
  });

  const login = () => {
    // Redirect to Google OAuth
    window.location.href = "/api/auth/google";
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/status"] });
      queryClient.clear();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return {
    isAuthenticated: data?.authenticated ?? false,
    isLoading,
    user: data?.user ?? null,
    oauthConfigured: data?.oauthConfigured ?? false,
    error,
    login,
    logout,
  };
}
