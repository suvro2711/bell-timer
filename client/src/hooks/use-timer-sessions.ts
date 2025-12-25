import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_BASE = "/api";

interface TimerSession {
  id: number;
  frequency: number;
  intervalSeconds: number;
  createdAt: Date;
}

interface CreateSessionInput {
  frequency: number;
  intervalSeconds: number;
}

// GET /api/sessions
export function useTimerSessions() {
  return useQuery({
    queryKey: [`${API_BASE}/sessions`],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/sessions`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return await res.json() as TimerSession[];
    },
  });
}

// POST /api/sessions
export function useCreateTimerSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateSessionInput) => {
      const res = await fetch(`${API_BASE}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create session");
      }

      return await res.json() as TimerSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${API_BASE}/sessions`] });
    },
  });
}
