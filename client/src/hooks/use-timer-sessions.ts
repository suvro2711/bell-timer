import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InsertTimerSession } from "@shared/routes";

// GET /api/sessions
export function useTimerSessions() {
  return useQuery({
    queryKey: [api.sessions.list.path],
    queryFn: async () => {
      const res = await fetch(api.sessions.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return api.sessions.list.responses[200].parse(await res.json());
    },
  });
}

// POST /api/sessions
export function useCreateTimerSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertTimerSession) => {
      // Validate with schema first
      const validated = api.sessions.create.input.parse(data);
      
      const res = await fetch(api.sessions.create.path, {
        method: api.sessions.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.sessions.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create session");
      }

      return api.sessions.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.sessions.list.path] });
    },
  });
}
