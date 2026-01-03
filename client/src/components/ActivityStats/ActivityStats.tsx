import { useEffect, useState, useMemo } from "react";
import { SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import categories from "@/constants/categories.json";
import { CustomSelect as Select } from "../ui_compound/CustomSelect";
import { useGroups } from "./components/useGroups";
import { useActivities } from "./components/useActivities";
import { useFetchSheet } from "@/hooks/useFetchSheet";
import { CalendarHeatmap } from "./components/CalendarHeatmap";

const WORKSHEET_ID = import.meta.env.MY_STATS_SHEETS_SPREADSHEET_ID || '1gZqw_qnxz-KpcciM6_tN5Oi7Vmz56QQzbexYCPgTCU8';

export function ActivityStats() {
  const { groups, selectedGroup, setSelectedGroup } = useGroups();
  const { activities, selectedActivity, setSelectedActivity } = useActivities();
  const { data, loading, error } = useFetchSheet({ 
    worksheetId: WORKSHEET_ID, 
    sheetName: "2025" 
  });

  const filteredActivityData = useMemo(() => {
    if (!selectedActivity || !data.length) return [];
    
    return data.filter((row: any) => 
      row['Activity type'] === selectedActivity || row.activityType === selectedActivity
    );
  }, [selectedActivity, data]);

  useEffect(() => {
    console.log('useFetchSheet state:', { data, loading, error, WORKSHEET_ID });
    if (data) {
      console.log('2025 data from my_stats:', data);
    }
    if (error) {
      console.error('Error from useFetchSheet:', error);
    }
  }, [data, loading, error]);

  useEffect(() => {
    if (selectedActivity) {
      console.log('Selected activity:', selectedActivity);
      
      // Filter data to show only the selected activity
      const activityData = data.filter((row: any) => 
        row['Activity type'] === selectedActivity || row.activityType === selectedActivity
      );
      
      console.log('Activity data:', activityData);
    }
  }, [selectedActivity, data]);
  
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-semibold">Activities</h2>
      
      <div className="space-y-2">
        <Select 
          onValueChange={setSelectedGroup}
          options={groups}
          label="Groups"
        />
      </div>

      <div className="space-y-2">
        <Select 
          onValueChange={setSelectedActivity}
          options={activities}
          label="Activities"
        />
      </div>

      {selectedActivity && filteredActivityData.length > 0 && (
        <div className="mt-8">
          <CalendarHeatmap 
            data={filteredActivityData} 
            activityName={selectedActivity}
          />
        </div>
      )}
    </div>
  );
}
