import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { api } from "@shared/routes";

export function useActivityGroups() {
  return useQuery<string[]>({
    queryKey: [api.activityGroups.list.path],
  });
}

export function useSaveActivityGroups() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groups: string[]) => {
      const res = await apiRequest("POST", api.activityGroups.save.path, { groups });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.activityGroups.list.path] });
    },
  });
}
