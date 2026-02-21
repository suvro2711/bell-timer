import React, { useMemo, useState } from "react";
import { useFetchSheets } from "@/hooks/useFetchMultipleSheets";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const WORKSHEET_ID = import.meta.env.MY_STATS_SHEETS_SPREADSHEET_ID || '1gZqw_qnxz-KpcciM6_tN5Oi7Vmz56QQzbexYCPgTCU8';

export function SleepActivity() {
  const now = new Date();
  const [filterType, setFilterType] = useState<"month" | "range">("month");
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(now.getFullYear(), now.getMonth(), 1),
    to: new Date(now.getFullYear(), now.getMonth() + 1, 0)
  });

  const sheetNames = useMemo(() => {
    if (filterType === "month") {
      const monthDate = new Date(selectedYear, selectedMonth, 1);
      const monthShort = monthDate.toLocaleString('en-US', { month: 'short' }).toLowerCase();
      return [`${monthShort}_${selectedYear}`];
    } else {
      if (!dateRange?.from) return [];
      const start = dateRange.from;
      const end = dateRange.to || dateRange.from;
      
      const names = [];
      let current = new Date(start.getFullYear(), start.getMonth(), 1);
      const endDate = new Date(end.getFullYear(), end.getMonth(), 1);
      
      while (current <= endDate) {
        const monthShort = current.toLocaleString('en-US', { month: 'short' }).toLowerCase();
        names.push(`${monthShort}_${current.getFullYear()}`);
        current.setMonth(current.getMonth() + 1);
      }
      return names;
    }
  }, [filterType, selectedMonth, selectedYear, dateRange]);

  const { sheets, loading, error } = useFetchSheets({ 
    worksheetId: WORKSHEET_ID, 
    sheetNames 
  });

  const combinedData = useMemo(() => {
    return Object.values(sheets).flatMap(s => s.data || []);
  }, [sheets]);

  const chartData = useMemo(() => {
    if (!combinedData || combinedData.length === 0) return [];

    const sleepData = combinedData.filter(row => row.activity_type === 'Sleep' && row.from && row.to);
    
    let dailyData: { day: string | number, ranges: [number, number][], fullDate: Date }[] = [];
    
    if (filterType === "month") {
      const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      dailyData = Array.from({ length: daysInMonth }, (_, i) => ({
        day: i + 1,
        ranges: [] as [number, number][],
        fullDate: new Date(selectedYear, selectedMonth, i + 1)
      }));
    } else {
      if (!dateRange?.from) return [];
      const start = dateRange.from;
      const end = dateRange.to || dateRange.from;
      
      const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      dailyData = Array.from({ length: days }, (_, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        return {
          day: `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })}`,
          ranges: [] as [number, number][],
          fullDate: d
        };
      });
    }

    sleepData.forEach(row => {
      try {
        const [fromDate, fromTime] = row.from.split(' ');
        const [fromDay, fromMonth, fromYear] = fromDate.split('-');
        const [fromHour, fromMinute] = fromTime.split(':');
        const start = new Date(Number(fromYear), Number(fromMonth) - 1, Number(fromDay), Number(fromHour), Number(fromMinute));

        const [toDate, toTime] = row.to.split(' ');
        const [toDay, toMonth, toYear] = toDate.split('-');
        const [toHour, toMinute] = toTime.split(':');
        const end = new Date(Number(toYear), Number(toMonth) - 1, Number(toDay), Number(toHour), Number(toMinute));

        // Assign to the day they woke up
        const wakeUpDay = end.getDate();
        const wakeUpMonth = end.getMonth();
        const wakeUpYear = end.getFullYear();
        
        const noonPreviousDay = new Date(end);
        noonPreviousDay.setHours(12, 0, 0, 0);
        noonPreviousDay.setDate(noonPreviousDay.getDate() - 1);

        const startHours = (start.getTime() - noonPreviousDay.getTime()) / (1000 * 60 * 60);
        const endHours = (end.getTime() - noonPreviousDay.getTime()) / (1000 * 60 * 60);

        if (filterType === "month") {
          if (wakeUpMonth === selectedMonth && wakeUpYear === selectedYear) {
            const dayIndex = wakeUpDay - 1;
            if (dayIndex >= 0 && dayIndex < dailyData.length) {
              dailyData[dayIndex].ranges.push([startHours, endHours]);
            }
          }
        } else {
          if (dateRange?.from) {
            const rangeStart = dateRange.from;
            const rangeEnd = dateRange.to || dateRange.from;
            
            const wakeUpDateOnly = new Date(wakeUpYear, wakeUpMonth, wakeUpDay);
            const rangeStartOnly = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
            const rangeEndOnly = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate());
            
            if (wakeUpDateOnly >= rangeStartOnly && wakeUpDateOnly <= rangeEndOnly) {
              const dayIndex = Math.round((wakeUpDateOnly.getTime() - rangeStartOnly.getTime()) / (1000 * 60 * 60 * 24));
              if (dayIndex >= 0 && dayIndex < dailyData.length) {
                dailyData[dayIndex].ranges.push([startHours, endHours]);
              }
            }
          }
        }
      } catch (e) {
        console.error("Error parsing sleep row", row, e);
      }
    });

    // For Recharts BarChart, we can only provide one range per dataKey.
    // To support multiple sleep sessions (e.g., naps), we can use a custom shape.
    // But for simplicity, let's just use the longest sleep session as the main range,
    // or we can map ranges to range1, range2, etc.
    return dailyData.map(d => {
      const sortedRanges = d.ranges.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]));
      return {
        ...d,
        range: sortedRanges.length > 0 ? sortedRanges[0] : null,
        range2: sortedRanges.length > 1 ? sortedRanges[1] : null,
        range3: sortedRanges.length > 2 ? sortedRanges[2] : null,
      };
    });
  }, [combinedData, filterType, selectedMonth, selectedYear, dateRange]);

  const formatYAxis = (val: number) => {
    const totalHours = val + 12;
    const h = Math.floor(totalHours) % 24;
    const m = Math.round((totalHours % 1) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (!data.ranges || data.ranges.length === 0) return null;
      
      return (
        <div className="bg-background border rounded p-2 shadow-md">
          <p className="font-semibold">Day {label}</p>
          {data.ranges.map((range: [number, number], idx: number) => {
            const startStr = formatYAxis(range[0]);
            const endStr = formatYAxis(range[1]);
            const duration = (range[1] - range[0]).toFixed(1);
            return (
              <div key={idx} className="mt-1">
                <p className="text-sm">Sleep {idx + 1}: {startStr} - {endStr}</p>
                <p className="text-xs text-muted-foreground">Duration: {duration} hrs</p>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  if (loading) return <div>Loading sleep data...</div>;
  if (error) return <div className="text-red-500">Error loading sleep data: {error}</div>;

  const monthDate = new Date(selectedYear, selectedMonth, 1);
  const monthShort = monthDate.toLocaleString('en-US', { month: 'short' });

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 gap-4">
        <CardTitle>
          Sleep Schedule {filterType === "month" ? `(${monthShort} ${selectedYear})` : (dateRange?.from ? `(${format(dateRange.from, "MMM d, yyyy")} - ${dateRange.to ? format(dateRange.to, "MMM d, yyyy") : ""})` : "")}
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filterType} onValueChange={(v: "month" | "range") => setFilterType(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">By Month</SelectItem>
              <SelectItem value="range">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {filterType === "month" ? (
            <>
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {new Date(2000, i, 1).toLocaleString('en-US', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => {
                    const y = new Date().getFullYear() - 2 + i;
                    return (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </>
          ) : (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "w-[260px] justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              barGap={0}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="day" 
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tickFormatter={formatYAxis} 
                domain={[0, 'dataMax']} 
                ticks={[0, 4, 8, 12, 16, 20, 24, 28, 32]}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="range" radius={[4, 4, 4, 4]} fill="#8b5cf6" />
              <Bar dataKey="range2" radius={[4, 4, 4, 4]} fill="#a78bfa" />
              <Bar dataKey="range3" radius={[4, 4, 4, 4]} fill="#c4b5fd" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
