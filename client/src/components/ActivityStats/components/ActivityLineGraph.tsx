import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ActivityRowData } from "../ActivityInterface";

interface ActivityLineGraphProps {
  data: ActivityRowData[];
  activityName: string;
  year: number;
}

type TimeFrame = "year" | "month" | "week";

export function ActivityLineGraph({ data, activityName, year }: ActivityLineGraphProps) {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("month");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(year);

  // Parse duration to hours
  const parseDuration = (durationStr: string | number | undefined): number => {
    if (!durationStr) return 0;
    
    if (typeof durationStr === 'string' && durationStr.includes(':')) {
      const [h, m] = durationStr.split(':').map(Number);
      return h + (m / 60);
    }
    return parseFloat(String(durationStr)) || 0;
  };

  // Parse date from "from" field
  const parseDate = (dateStr: string | undefined): Date | null => {
    if (!dateStr) return null;
    const [datePart] = dateStr.split(' ');
    const [day, month, year] = datePart.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Aggregate data based on timeframe
  const chartData = useMemo(() => {
    if (!data.length) return [];

    const aggregated = new Map<string, { label: string; hours: number; date: Date }>();

    data.forEach((row) => {
      const date = parseDate(row.from);
      if (!date) return;

      const hours = parseDuration(row.duration);
      let key: string;
      let label: string;

      if (timeFrame === "year") {
        // Aggregate by month
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        key = monthKey;
        label = date.toLocaleDateString('en-US', { month: 'short' });
      } else if (timeFrame === "month") {
        // Filter by selected month and aggregate by day
        if (date.getMonth() + 1 !== selectedMonth || date.getFullYear() !== selectedYear) {
          return;
        }
        const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        key = dayKey;
        label = String(date.getDate());
      } else {
        // Week: aggregate by day for current week
        const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        key = dayKey;
        label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      const existing = aggregated.get(key);
      if (existing) {
        existing.hours += hours;
      } else {
        aggregated.set(key, { label, hours, date });
      }
    });

    // Convert to array and sort by date
    return Array.from(aggregated.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(({ label, hours }) => ({
        label,
        hours: parseFloat(hours.toFixed(2))
      }));
  }, [data, timeFrame, selectedMonth, selectedYear]);

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const availableYears = [2023, 2024, 2025, 2026];

  const maxHours = Math.max(...chartData.map(d => d.hours), 0);
  const yAxisMax = Math.ceil(maxHours * 1.1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h3 className="text-lg font-semibold">{activityName} Progress</h3>
        <div className="flex gap-2">
          <Select value={timeFrame} onValueChange={(val) => setTimeFrame(val as TimeFrame)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="year">Year</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="week">Week</SelectItem>
            </SelectContent>
          </Select>
          
          {timeFrame === "month" && (
            <>
              <Select value={selectedMonth.toString()} onValueChange={(val) => setSelectedMonth(parseInt(val))}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>
      </div>

      <div className="w-full h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="label" 
              tick={{ fontSize: 12 }}
              angle={timeFrame === "month" ? 0 : -45}
              textAnchor={timeFrame === "month" ? "middle" : "end"}
              height={timeFrame === "month" ? 30 : 60}
            />
            <YAxis 
              label={{ value: 'Hours', angle: -90, position: 'insideLeft' }}
              domain={[0, yAxisMax]}
            />
            <Tooltip 
              formatter={(value: number) => [`${value.toFixed(2)} hours`, 'Time Spent']}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="hours" 
              stroke="#8884d8" 
              strokeWidth={2}
              dot={{ fill: '#8884d8', r: 4 }}
              activeDot={{ r: 6 }}
              name="Hours"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {chartData.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          No data available for the selected time frame
        </div>
      )}
    </div>
  );
}
