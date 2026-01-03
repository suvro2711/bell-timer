import { useEffect, useState } from "react";
import categories from "@/constants/categories.json";

export interface Activity {
  key: string;
  name: string;
  icon: string;
  group: string;
  groupIcon: string;
}

export function useActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<string>("");

  useEffect(() => {
    const flattened: Activity[] = [];
    
    Object.entries(categories).forEach(([groupKey, groupData]) => {
      const groupIcon = groupData.icon;
      
      groupData.activities.forEach(activity => {
        flattened.push({
          key: activity.name,
          name: activity.name,
          icon: activity.icon,
          group: groupKey,
          groupIcon: groupIcon
        });
      });
    });

    setActivities(flattened);
  }, []);

  return {
    activities,
    selectedActivity,
    setSelectedActivity
  };
}
