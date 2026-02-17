import React from "react";
import categories from "@/constants/categories.json";
import {
	Table,
	TableHeader,
	TableBody,
	TableHead,
	TableRow,
	TableCell,
} from "@/components/ui/table";
import { useFetchSheet } from "@/hooks/useFetchSheet";
import { Activity } from "@/types/activities.ts";
import { ActivitySyncModal } from "@/components/Activties/ActivitySync";

const WORKSHEET_ID = import.meta.env.MY_STATS_SHEETS_SPREADSHEET_ID || '1gZqw_qnxz-KpcciM6_tN5Oi7Vmz56QQzbexYCPgTCU8';

// Flatten activities from categories.json
const getAllActivities = () => {
	const result: { name: string; icon: string; group: string; groupIcon: string }[] = [];
	Object.entries(categories).forEach(([group, value]: any) => {
		value.activities.forEach((activity: any) => {
			result.push({
				name: activity.name,
				icon: activity.icon,
				group,
				groupIcon: value.icon,
			});
		});
	});
	return result;
};

const activities = getAllActivities();

const Activities: React.FC = () => {

    const { data, loading, error }: { data: Activity[]; loading: boolean; error: string | null } = useFetchSheet({ 
        worksheetId: WORKSHEET_ID, 
        sheetName: `${'jan_2026'}` // e.g., jan_2026
    });
    console.log(data);
	return (
		<div className="p-6 max-w-2xl mx-auto">
            <ActivitySyncModal open={true} onClose={() => {}} worksheetId={WORKSHEET_ID} />
			<h1 className="text-2xl font-bold mb-4">All Activities</h1>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Activity</TableHead>
						<TableHead>Icon</TableHead>
						<TableHead>Group</TableHead>
						<TableHead>Group Icon</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{activities.map((a) => (
						<TableRow key={a.name + a.group}>
							<TableCell>{a.name}</TableCell>
							<TableCell>{a.icon}</TableCell>
							<TableCell>{a.group}</TableCell>
							<TableCell>{a.groupIcon}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
};

export default Activities;
