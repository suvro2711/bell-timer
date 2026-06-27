import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { api, type GroupNode } from "@shared/routes";

export function useActivityGroups() {
  return useQuery<GroupNode[]>({
    queryKey: [api.activityGroups.list.path],
    // Override the global staleTime:Infinity so that groups are always
    // re-fetched on mount. Without this, a cached empty-array response from
    // a first visit (empty sheet) would be served forever and the page would
    // show no groups even after they were added.
    staleTime: 0,
  });
}

export function useSaveActivityGroups() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groups: GroupNode[]) => {
      const res = await apiRequest("POST", api.activityGroups.save.path, { groups });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.activityGroups.list.path] });
    },
  });
}
