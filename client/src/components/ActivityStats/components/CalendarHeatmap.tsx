import { useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ActivityRowData } from "../ActivityInterface";

interface CalendarHeatmapProps {
  data: ActivityRowData[];
  activityName: string;
  year: number;
  onYearChange: (year: number) => void;
}

export function CalendarHeatmap({ data, activityName, year, onYearChange }: CalendarHeatmapProps) {
  // Process data to get time spent per day (in hours)
  const heatmapData = useMemo(() => {
    const dayMap = new Map<string, number>();
    
    data.forEach((row) => {
      // Extract date from "from" field (format: "DD-MM-YYYY HH:MM")
      const dateStr = row.from;
      if (!dateStr) return;
      
      const [datePart] = dateStr.split(' ');
      const [day, month, year] = datePart.split('-');
      const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      
      // Parse duration (can be in format "HH:MM" or just hours as number)
      let hours = 0;
      const durationStr = row.duration || '0';
      
      if (typeof durationStr === 'string' && durationStr.includes(':')) {
        // Format: "HH:MM"
        const [h, m] = durationStr.split(':').map(Number);
        hours = h + (m / 60);
      } else {
        // Format: number or string number
        hours = parseFloat(String(durationStr)) || 0;
      }
      
      dayMap.set(date, (dayMap.get(date) || 0) + hours);
    });
    
    return dayMap;
  }, [data]);

  // Generate calendar grid for the year
  const calendarGrid = useMemo(() => {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    
    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];
    
    // Start from the first day of the year
    const current = new Date(startDate);
    
    // Add empty cells for days before the start
    const startDay = current.getDay();
    for (let i = 0; i < startDay; i++) {
      currentWeek.push(new Date(0)); // placeholder
    }
    
    while (current <= endDate) {
      currentWeek.push(new Date(current));
      
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    // Add remaining days
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(new Date(0)); // placeholder
      }
      weeks.push(currentWeek);
    }
    
    return weeks;
  }, [year]);

  // Generate month labels
  const monthLabels = useMemo(() => {
    const labels: { month: string; startWeek: number; weeksSpan: number }[] = [];
    let currentMonth = -1;
    let startWeek = 0;
    let weeksInMonth = 0;

    calendarGrid.forEach((week, weekIdx) => {
      const firstRealDay = week.find(d => d.getTime() !== 0);
      if (firstRealDay) {
        const month = firstRealDay.getMonth();
        if (month !== currentMonth) {
          if (currentMonth !== -1) {
            labels.push({
              month: new Date(year, currentMonth).toLocaleDateString('en-US', { month: 'short' }),
              startWeek,
              weeksSpan: weeksInMonth
            });
          }
          currentMonth = month;
          startWeek = weekIdx;
          weeksInMonth = 1;
        } else {
          weeksInMonth++;
        }
      }
    });

    // Add last month
    if (currentMonth !== -1) {
      labels.push({
        month: new Date(year, currentMonth).toLocaleDateString('en-US', { month: 'short' }),
        startWeek,
        weeksSpan: weeksInMonth
      });
    }

    return labels;
  }, [calendarGrid, year]);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const availableYears = [2023, 2024, 2025, 2026];

  const getColor = (hours: number) => {
    if (hours === 0) return 'bg-gray-100 dark:bg-gray-800';
    if (hours < 1) return 'bg-green-200 dark:bg-green-900';
    if (hours < 2) return 'bg-green-300 dark:bg-green-700';
    if (hours < 3) return 'bg-green-400 dark:bg-green-600';
    return 'bg-green-600 dark:bg-green-400';
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{activityName} Consistency</h3>
        <Select value={year.toString()} onValueChange={(val) => onYearChange(parseInt(val))}>
          <SelectTrigger className="w-32">
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
      </div>
      
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Month labels */}
          <div className="flex ml-8 mb-1">
            {monthLabels.map((label, idx) => (
              <div
                key={idx}
                className="text-xs text-muted-foreground"
                style={{ 
                  width: `${label.weeksSpan * 16}px`,
                  minWidth: `${label.weeksSpan * 16}px`
                }}
              >
                {label.month}
              </div>
            ))}
          </div>

          <div className="flex gap-1">
            {/* Weekday labels */}
            <div className="flex flex-col gap-1 text-xs text-muted-foreground justify-around pr-2">
              {weekDays.map((day, idx) => (
                <div key={idx} className="h-3 flex items-center">
                  {idx % 2 === 1 ? day : ''}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            {calendarGrid.map((week, weekIdx) => (
              <div key={weekIdx} className="flex flex-col gap-1">
                {week.map((date, dayIdx) => {
                  if (date.getTime() === 0) {
                    return <div key={dayIdx} className="w-3 h-3" />;
                  }
                  
                  const dateStr = formatDate(date);
                  const hours = heatmapData.get(dateStr) || 0;
                  const displayTime = hours < 1 
                    ? `${Math.round(hours * 60)}m` 
                    : `${hours.toFixed(1)}h`;
                  
                  return (
                    <div
                      key={dayIdx}
                      className={`w-3 h-3 rounded-sm ${getColor(hours)} cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-blue-500 transition-all`}
                      title={`${dateStr}: ${displayTime}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          
          <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground ml-8">
            <span>Less</span>
            <div className="flex gap-1">
              <div className={`w-3 h-3 rounded-sm ${getColor(0)}`} />
              <div className={`w-3 h-3 rounded-sm ${getColor(0.25)}`} />
              <div className={`w-3 h-3 rounded-sm ${getColor(0.75)}`} />
              <div className={`w-3 h-3 rounded-sm ${getColor(1.5)}`} />
              <div className={`w-3 h-3 rounded-sm ${getColor(2)}`} />
            </div>
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
