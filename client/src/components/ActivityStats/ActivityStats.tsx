import { useEffect, useState } from "react";
import { SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import categories from "@/constants/categories.json";
import { CustomSelect as Select } from "../ui_compound/CustomSelect";
import { useGroups } from "./hooks/useGroups";
import { useActivities } from "./hooks/useActivities";
import { useFetchSheet } from "@/hooks/useFetchSheet";
import { CalendarHeatmap } from "./components/CalendarHeatmap";
import { ActivityCards } from "./components/ActivityCards/ActivityCards";
import { ActivityLineGraph } from "./components/ActivityLineGraph";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const WORKSHEET_ID = import.meta.env.MY_STATS_SHEETS_SPREADSHEET_ID || '1gZqw_qnxz-KpcciM6_tN5Oi7Vmz56QQzbexYCPgTCU8';

export function ActivityStats() {
  const { groups, selectedGroup, setSelectedGroup } = useGroups();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const monthShort = new Date().toLocaleString('en-US', { month: 'short' }).toLowerCase();
  const { data, loading, error } = useFetchSheet({ 
    worksheetId: WORKSHEET_ID, 
    sheetName: `${selectedYear}` // e.g., jan_2026
  });

  const { activities, selectedActivity, setSelectedActivity, selectedActivityData } = useActivities(data, selectedGroup);

  useEffect(() => {
    if (selectedActivity) {
      console.log('Selected activity:', selectedActivity);
      console.log('Activity data:', selectedActivityData);
    }
  }, [selectedActivity, selectedActivityData]);
  
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-semibold">Activities</h2>
      
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 space-y-2">
          <Select 
            onValueChange={setSelectedGroup}
            options={groups}
            label="Groups"
          />
        </div>

        <div className="flex-1 space-y-2">
          <Select 
            onValueChange={setSelectedActivity}
            options={activities}
            label="Activities"
          />
        </div>
      </div>

      <Accordion type="single" collapsible className="mt-8" defaultValue="calendar">
        <AccordionItem value="graph">
          <AccordionTrigger>Activity Progress</AccordionTrigger>
          <AccordionContent>
            <ActivityLineGraph 
              data={selectedActivityData} 
              activityName={selectedActivity}
              year={selectedYear}
            />
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="calendar" >
          <AccordionTrigger>Activity Consistency</AccordionTrigger>
          <AccordionContent>
            <CalendarHeatmap 
              data={selectedActivityData} 
              activityName={selectedActivity}
              year={selectedYear}
              onYearChange={setSelectedYear}
            />
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="cards">
          <AccordionTrigger>Activity Cards</AccordionTrigger>
          <AccordionContent>
            <ActivityCards data={selectedActivityData} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
