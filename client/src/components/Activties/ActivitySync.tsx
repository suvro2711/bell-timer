import React, { useMemo } from "react";
// Update the import path below to the correct relative path if needed
import { useFetchSheets } from "@/hooks/useFetchMultipleSheets";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { ActivityRowData } from "../ActivityStats/hooks/useActivities";

interface ActivitySyncModalProps {
  open: boolean;
  onClose: () => void;
  worksheetId: string;
}

function getLastTwoMonthSheetNames(): [string, string] {
  const now = new Date();
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const thisMonthIdx = now.getMonth();
  const prevMonthIdx = (thisMonthIdx + 11) % 12;
  const year = now.getFullYear();
  const prevYear = thisMonthIdx === 0 ? year - 1 : year;

  const prevMonthSheet = `${months[prevMonthIdx]}_${prevYear}`;
  const thisMonthSheet = `${months[thisMonthIdx]}_${year}`;
  return [prevMonthSheet, thisMonthSheet];
}

export const ActivitySyncModal: React.FC<ActivitySyncModalProps> = ({ open, onClose, worksheetId }) => {
  const [prevSheet, currSheet] = useMemo(getLastTwoMonthSheetNames, []);
const { sheets, loading, error }: { sheets: Record<string, { data: ActivityRowData[] }>, loading: boolean, error: string | null } = useFetchSheets({
    worksheetId,
    sheetNames: [prevSheet, currSheet],
});

// Collect all activities from both sheets
const allActivities = [
    ...(sheets?.[prevSheet]?.data ?? []),
    ...(sheets?.[currSheet]?.data ?? []),
];

// Get unique activities by name (assuming each activity has a 'name' property)
const uniqueActivities = Array.from(
    new Map(allActivities.map((activity: ActivityRowData) => [activity.activity_type, activity])).values()
);

console.log("Unique activities from last two months:", uniqueActivities);

  let content;
  if (loading) {
    content = <div>Loading...</div>;
  } else if (error) {
    content = <div className="text-red-500">Error: {error}</div>;
  } else {
    content = (
    <div className="mt-4">
        <strong>Unique Activities ({uniqueActivities.length}):</strong>
        <ul className="list-disc list-inside">
            {uniqueActivities.map((activity: ActivityRowData) => (
                <li key={activity.activity_type}>{activity.activity_type}</li>
            ))}
        </ul>
    </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Activity Counts (Last 2 Months)</DialogTitle>
        </DialogHeader>
        {content}
        <DialogClose asChild>
          <button className="mt-4 px-4 py-2 bg-gray-200 rounded">Close</button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
};