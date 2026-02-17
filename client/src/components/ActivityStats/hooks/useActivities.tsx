import { useEffect, useState, useMemo } from "react";
import groupsJson from "@/constants/categories.json";

export interface Activity {
  key: string;
  name: string;
  icon: string;
  group: string;
  groupIcon: string;
}

export interface ActivityRowData {
  activity_type?: string;
  duration?: string | number;
  from?: string;
  to?: string;
  comment?: string;
  [key: string]: any;
}

interface UseActivitiesReturn {
  activities: Activity[];
  selectedActivity: string;
  setSelectedActivity: (activity: string) => void;
  selectedActivityData: ActivityRowData[];
}

export const useActivities = (data: any[] = [], selectedGroup: string = ""): UseActivitiesReturn => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<string>("");

  const shouldIncludeGroup = (groupKey: string): boolean => {
    if (!selectedGroup || selectedGroup === 'all') return true;
    if (selectedGroup === 'none') return false;
    return groupKey === selectedGroup;
  };

  const buildActivityList = (): Activity[] => {
    const activityList: Activity[] = [];
    
    Object.entries(groupsJson).forEach(([groupKey, groupData]) => {
      if (shouldIncludeGroup(groupKey)) {
        groupData.activities.forEach(activity => {
          activityList.push({
            key: activity.name,
            name: activity.name,
            icon: activity.icon,
            group: groupKey,
            groupIcon: groupData.icon
          });
        });
      }
    });

    return activityList;
  };

  useEffect(() => {
    setActivities(buildActivityList());
    setSelectedActivity("");
  }, [selectedGroup]);

  const selectedActivityData: ActivityRowData[] = useMemo(() => {
    if (!selectedActivity || !data.length) return [];
    
    return data.filter((row: any) => 
      row.activity_type === selectedActivity
    );
  }, [selectedActivity, data]);

  return {
    activities,
    selectedActivity,
    setSelectedActivity,
    selectedActivityData
  };
}
