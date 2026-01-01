import { useTimerSessions, useDeleteTimerSession } from "@/hooks/use-timer-sessions";
import { format } from "date-fns";
import { Clock, Trash2, MoreVertical, ArrowLeft, Calendar } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

export default function HistoryPage() {
  const { data: sessions, isLoading } = useTimerSessions();
  const deleteSession = useDeleteTimerSession();
  const { toast } = useToast();
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

  const handleDeleteSession = (id: number) => {
    deleteSession.mutate(id, {
      onSuccess: () => {
        toast({
          title: "Session Deleted",
          description: "The session has been removed from history.",
        });
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to delete session. Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Header */}
      <header className="py-6 px-4 md:px-8 border-b border-border/40 bg-background/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link href="/">
            <a className="p-2 hover:bg-secondary rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </a>
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg text-primary-foreground shadow-lg shadow-primary/20">
              <Clock className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Session History</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-8">
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
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="p-4 rounded-xl hover:bg-secondary/50 transition-colors border border-border/50 group"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="font-medium text-foreground flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary/40 group-hover:bg-primary transition-colors"></span>
                        {session.timer} min timer × {session.intervalFrequency} min intervals
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {session.createdAt && format(new Date(session.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 hover:bg-secondary rounded-md transition-colors">
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive cursor-pointer"
                          onClick={() => handleDeleteSession(session.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </motion.div>
              ))}
            </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
