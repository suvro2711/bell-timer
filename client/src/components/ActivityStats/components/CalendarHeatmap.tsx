import { useMemo } from "react";

interface CalendarHeatmapProps {
  data: any[];
  activityName: string;
}

export function CalendarHeatmap({ data, activityName }: CalendarHeatmapProps) {
  // Process data to get time spent per day (in hours)
  const heatmapData = useMemo(() => {
    const dayMap = new Map<string, number>();
    
    data.forEach((row) => {
      // Extract date from "From" field (format: "DD-MM-YYYY HH:MM")
      const dateStr = row.From || row.from;
      if (!dateStr) return;
      
      const [datePart] = dateStr.split(' ');
      const [day, month, year] = datePart.split('-');
      const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      
      // Parse duration (can be in format "HH:MM" or just hours as number)
      let hours = 0;
      const durationStr = row['Duration(hours)'] || row.duration || row.Duration || '0';
      
      if (typeof durationStr === 'string' && durationStr.includes(':')) {
        // Format: "HH:MM"
        const [h, m] = durationStr.split(':').map(Number);
        hours = h + (m / 60);
      } else {
        // Format: number or string number
        hours = parseFloat(durationStr) || 0;
      }
      
      dayMap.set(date, (dayMap.get(date) || 0) + hours);
    });
    
    return dayMap;
  }, [data]);

  // Generate calendar grid for the year
  const calendarGrid = useMemo(() => {
    const year = 2025;
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
  }, []);

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
      <h3 className="text-lg font-semibold">{activityName} Consistency</h3>
      
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="flex gap-1">
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
          
          <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
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
