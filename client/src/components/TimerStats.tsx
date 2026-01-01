import { useState, useMemo } from "react";
import { Calendar, TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface Session {
  id: number;
  intervalFrequency: number;
  timer: number;
  createdAt: Date;
}

interface TimerStatsProps {
  sessions: Session[];
  isLoading: boolean;
}

export function TimerStats({ sessions, isLoading }: TimerStatsProps) {
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  // Get unique years from sessions
  const availableYears = useMemo(() => {
    if (!sessions) return [];
    const years = new Set(
      sessions.map(s => new Date(s.createdAt).getFullYear().toString())
    );
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  }, [sessions]);

  // Get available months for selected year
  const availableMonths = useMemo(() => {
    if (!sessions || selectedYear === "all") return [];
    const yearSessions = sessions.filter(
      s => new Date(s.createdAt).getFullYear().toString() === selectedYear
    );
    const months = new Set(
      yearSessions.map(s => (new Date(s.createdAt).getMonth() + 1).toString())
    );
    return Array.from(months).sort((a, b) => parseInt(a) - parseInt(b));
  }, [sessions, selectedYear]);

  // Reset month when year changes
  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    setSelectedMonth("all");
  };

  // Filter sessions by year and month
  const filteredSessions = useMemo(() => {
    if (!sessions) return [];
    
    let filtered = sessions;
    
    // Filter by year
    if (selectedYear !== "all") {
      filtered = filtered.filter(
        s => new Date(s.createdAt).getFullYear().toString() === selectedYear
      );
    }
    
    // Filter by month
    if (selectedMonth !== "all") {
      filtered = filtered.filter(
        s => (new Date(s.createdAt).getMonth() + 1).toString() === selectedMonth
      );
    }
    
    return filtered;
  }, [sessions, selectedYear, selectedMonth]);

  // Prepare chart data - group sessions by day
  const chartData = useMemo(() => {
    if (!filteredSessions.length) return [];

    // Group sessions by date
    const sessionsByDate = filteredSessions.reduce((acc, session) => {
      const date = new Date(session.createdAt);
      const dateKey = date.toISOString().split('T')[0];
      
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          count: 0,
          totalMinutes: 0,
        };
      }
      
      acc[dateKey].count += 1;
      acc[dateKey].totalMinutes += session.timer;
      
      return acc;
    }, {} as Record<string, { date: string; count: number; totalMinutes: number }>);

    // Convert to array and sort by date
    return Object.values(sessionsByDate)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(item => ({
        date: new Date(item.date).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }),
        sessions: item.count,
        minutes: item.totalMinutes,
      }));
  }, [filteredSessions]);

  // Calculate stats including streaks
  const stats = useMemo(() => {
    if (!sessions.length) return null;

    // Use all sessions for streak calculation (not filtered)
    const allUniqueDates = Array.from(
      new Set(sessions.map(s => new Date(s.createdAt).toISOString().split('T')[0]))
    ).sort();

    // Calculate current streak
    let currentStreak = 0;
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    // Check if there's a session today or yesterday to start counting
    if (allUniqueDates.includes(today) || allUniqueDates.includes(yesterday)) {
      let checkDate = new Date();
      if (!allUniqueDates.includes(today)) {
        checkDate = new Date(Date.now() - 86400000); // Start from yesterday
      }
      
      while (true) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (allUniqueDates.includes(dateStr)) {
          currentStreak++;
          checkDate = new Date(checkDate.getTime() - 86400000); // Go back one day
        } else {
          break;
        }
      }
    }

    // Calculate max streak
    let maxStreak = 0;
    let tempStreak = 1;
    
    for (let i = 1; i < allUniqueDates.length; i++) {
      const prevDate = new Date(allUniqueDates[i - 1]);
      const currDate = new Date(allUniqueDates[i]);
      const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / 86400000);
      
      if (diffDays === 1) {
        tempStreak++;
      } else {
        maxStreak = Math.max(maxStreak, tempStreak);
        tempStreak = 1;
      }
    }
    maxStreak = Math.max(maxStreak, tempStreak);

    // Calculate stats for filtered sessions
    const totalSessions = filteredSessions.length;
    const totalMinutes = filteredSessions.reduce((sum, s) => sum + s.timer, 0);
    const avgMinutesPerSession = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0;
    
    const uniqueDays = new Set(
      filteredSessions.map(s => new Date(s.createdAt).toISOString().split('T')[0])
    ).size;
    const sessionsPerDay = uniqueDays > 0 ? (totalSessions / uniqueDays).toFixed(1) : "0";

    return {
      totalSessions,
      totalMinutes,
      avgMinutesPerSession,
      activeDays: uniqueDays,
      sessionsPerDay,
      currentStreak,
      maxStreak,
    };
  }, [sessions, filteredSessions]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const chartConfig = {
    sessions: {
      label: "Sessions",
      color: "hsl(var(--primary))",
    },
    minutes: {
      label: "Minutes",
      color: "hsl(var(--chart-2))",
    },
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      {availableYears.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 justify-end">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <select
              value={selectedYear}
              onChange={(e) => handleYearChange(e.target.value)}
              className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Years</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {selectedYear !== "all" && availableMonths.length > 0 && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Months</option>
              {availableMonths.map(month => (
                <option key={month} value={month}>
                  {monthNames[parseInt(month) - 1]}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading statistics...
        </div>
      ) : !filteredSessions?.length ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">No data available</p>
          <p className="text-sm mt-2">Complete some timer sessions to see statistics</p>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>🔥 Current Streak</CardDescription>
                  <CardTitle className="text-3xl">{stats.currentStreak}</CardTitle>
                  <p className="text-xs text-muted-foreground">days</p>
                </CardHeader>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>🏆 Max Streak</CardDescription>
                  <CardTitle className="text-3xl">{stats.maxStreak}</CardTitle>
                  <p className="text-xs text-muted-foreground">days</p>
                </CardHeader>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>❤️ Total Sessions</CardDescription>
                  <CardTitle className="text-3xl">{stats.totalSessions}</CardTitle>
                </CardHeader>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>📊 Avg per Session</CardDescription>
                  <CardTitle className="text-3xl">{stats.avgMinutesPerSession}m</CardTitle>
                </CardHeader>
              </Card>
            </div>
          )}

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Timer Consistency</CardTitle>
              <CardDescription>
                Daily meditation sessions
                {selectedYear !== "all" && selectedMonth === "all" && ` in ${selectedYear}`}
                {selectedMonth !== "all" && ` in ${monthNames[parseInt(selectedMonth) - 1]} ${selectedYear}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="fillSessions" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="var(--color-sessions)"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--color-sessions)"
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      className="text-xs"
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      className="text-xs"
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="sessions"
                      stroke="var(--color-sessions)"
                      fill="url(#fillSessions)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
              
              {stats && (
                <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                  <TrendingUp className="w-4 h-4" />
                  <span>
                    Averaging {stats.sessionsPerDay} sessions per day
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
