import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { api } from "@shared/routes";

export interface ActivityTaxonomyEntry {
  activity_name: string;
  groups: string[];
  tags: string[];
  is_background: boolean;
}

const UNIQUE_ACTIVITIES_URL = "/api/activity-taxonomy/activities";

/**
 * Fetches the unique activity names logged across the stats workbook.
 */
export function useUniqueActivities() {
  return useQuery<string[]>({
    queryKey: [UNIQUE_ACTIVITIES_URL],
  });
}

/**
 * Fetches the saved group/tag mappings for activities.
 */
export function useActivityTaxonomy() {
  return useQuery<ActivityTaxonomyEntry[]>({
    queryKey: [api.activityTaxonomy.list.path],
  });
}

/**
 * Persists the full set of activity group/tag mappings to the workbook.
 */
export function useSaveActivityTaxonomy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entries: ActivityTaxonomyEntry[]) => {
      const res = await apiRequest("POST", api.activityTaxonomy.save.path, { entries });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.activityTaxonomy.list.path] });
    },
  });
}
