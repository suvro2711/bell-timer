import { useEffect, useState } from "react";
import categories from "@/constants/categories.json";

export interface Group {
  key: string;
  name: string;
  icon: string;
}

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("");

  useEffect(() => {
    const groupsList: Group[] = [];
    
    Object.entries(categories).forEach(([groupKey, groupData]) => {
      groupsList.push({
        key: groupKey,
        name: groupKey.replace(/_/g, ' '),
        icon: groupData.icon
      });
    });

    setGroups(groupsList);
  }, []);

  return {
    groups,
    selectedGroup,
    setSelectedGroup
  };
}