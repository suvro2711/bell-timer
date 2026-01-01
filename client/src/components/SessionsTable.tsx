import { useState, useMemo } from "react";
import { Calendar } from "lucide-react";
import { SessionHistoryItem } from "./SessionHistoryItem";

interface Session {
  id: number;
  intervalFrequency: number;
  timer: number;
  createdAt: Date;
}

interface SessionsTableProps {
  sessions: Session[];
  isLoading: boolean;
  onDelete: (id: number) => void;
}

export function SessionsTable({ sessions, isLoading, onDelete }: SessionsTableProps) {
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

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="bg-card rounded-3xl border border-border shadow-xl p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-2xl font-bold">All Sessions</h2>
            
            {/* Filters */}
            {availableYears.length > 0 && (
              <div className="flex flex-wrap items-center gap-3">
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

                {/* Month Filter - only show when a year is selected */}
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
          </div>
      
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading sessions...
        </div>
      ) : !filteredSessions?.length ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">
            {selectedYear === "all" 
              ? "No sessions yet" 
              : selectedMonth === "all"
              ? `No sessions in ${selectedYear}`
              : `No sessions in ${monthNames[parseInt(selectedMonth) - 1]} ${selectedYear}`}
          </p>
          <p className="text-sm mt-2">
            {selectedYear === "all" 
              ? "Complete a timer to see it here"
              : "Try selecting a different period"}
          </p>
        </div>
      ) : (
        <div>
          <div className="text-sm text-muted-foreground mb-3">
            Showing {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''}
            {selectedYear !== "all" && selectedMonth === "all" && ` from ${selectedYear}`}
            {selectedMonth !== "all" && ` from ${monthNames[parseInt(selectedMonth) - 1]} ${selectedYear}`}
          </div>
          <div className="space-y-3">
            {filteredSessions.map((session, i) => (
              <SessionHistoryItem
                key={session.id}
                session={session}
                index={i}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
