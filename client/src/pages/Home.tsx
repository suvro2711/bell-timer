import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Play, RotateCcw, History, Clock, Bell, MoreVertical, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { useCreateTimerSession, useTimerSessions, useDeleteTimerSession } from "@/hooks/use-timer-sessions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CircularTimer } from "@/components/CircularTimer";
import { SoundPlayer } from "@/components/SoundPlayer";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";

// Validation schema for the form
const formSchema = z.object({
  intervalFrequency: z.coerce.number().min(1, "Must be at least 1 minute"),
  timer: z.coerce.number().min(1, "Timer must be at least 1 minute"),
});

type FormData = z.infer<typeof formSchema>;

export default function Home() {
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [currentRep, setCurrentRep] = useState(0);
  const [playTrigger, setPlayTrigger] = useState(0); // Increment to play sound

  // Store user inputs for the active session
  const [activeConfig, setActiveConfig] = useState<FormData | null>(null);

  const { toast } = useToast();
  const createSession = useCreateTimerSession();
  const deleteSession = useDeleteTimerSession();
  const { data: sessions, isLoading: isLoadingHistory } = useTimerSessions();

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

  // Initialize sheets when app loads
  useEffect(() => {
    const initializeSheets = async () => {
      try {
        const response = await fetch('/api/health');
        
        if (!response.ok) {
          console.warn('Health check returned non-OK status:', response.status);
          return;
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.warn('Health check returned non-JSON response');
          return;
        }
        
        const data = await response.json();
        console.log('Sheets initialization check:', data);
        
        if (!data.sheetsInitialized) {
          toast({
            title: "Warning",
            description: "Google Sheets initialization failed. Check server logs.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Failed to check sheets initialization:', error);
      }
    };
    
    initializeSheets();
  }, [toast]);

  const { register, handleSubmit, formState: { errors, isValid } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      intervalFrequency: 5,
      timer: 30,
    },
  });

  // Timer Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          const newValue = prev - 0.1; // 100ms updates for smooth UI
          
          if (activeConfig) {
             // Check if we crossed an interval boundary
             // timer is total time in minutes, intervalFrequency is bell interval in minutes
             const totalSeconds = activeConfig.timer * 60;
             const intervalSeconds = activeConfig.intervalFrequency * 60;
             const elapsed = totalSeconds - prev;
             const nextElapsed = totalSeconds - newValue;
             
             // Calculate how many intervals completed
             const completedReps = Math.floor(nextElapsed / intervalSeconds);
             const prevCompletedReps = Math.floor(elapsed / intervalSeconds);
             const totalReps = Math.floor(totalSeconds / intervalSeconds);

             if (completedReps > prevCompletedReps && completedReps <= totalReps) {
               setPlayTrigger(n => n + 1);
               setCurrentRep(completedReps);
             }
          }
          
          if (newValue <= 0) {
            setIsRunning(false);
            setPlayTrigger(n => n + 1); // Final bell
            setCurrentRep(activeConfig ? Math.floor((activeConfig.timer * 60) / (activeConfig.intervalFrequency * 60)) : 0);
            return 0;
          }
          return newValue;
        });
      }, 100);
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, activeConfig]);

  const onSubmit = (data: FormData) => {
    console.log('onSubmit called with data:', data);
    const duration = data.timer * 60; // Convert minutes to seconds
    setTotalDuration(duration);
    setTimeLeft(duration);
    setActiveConfig(data);
    setIsRunning(true);
    setCurrentRep(0);

    // Save session to DB
    console.log('Calling createSession.mutate...');
    createSession.mutate(data, {
      onSuccess: () => {
        console.log('Session created successfully!');
        toast({
          title: "Session Started",
          description: `Timer set for ${data.timer} minutes with ${data.intervalFrequency} minute intervals.`,
        });
      },
      onError: (error) => {
        console.error('Session creation failed:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to save session history.",
          variant: "destructive",
        });
      }
    });
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(0);
    setActiveConfig(null);
    setCurrentRep(0);
  };

  const progress = totalDuration > 0 ? timeLeft / totalDuration : 0;
  
  // Format seconds into MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <SoundPlayer playTrigger={playTrigger} />
      
      {/* Header */}
      <header className="py-6 px-4 md:px-8 border-b border-border/40 bg-background/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg text-primary-foreground shadow-lg shadow-primary/20">
              <Clock className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">FocusLoop</h1>
          </div>
          <div className="text-sm font-medium text-muted-foreground hidden sm:block">
            Interval Training Timer
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Left Column: Timer & Controls */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center min-h-[500px]">
          <AnimatePresence mode="wait">
            {!activeConfig ? (
              <motion.div 
                key="setup"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full max-w-md bg-card rounded-3xl p-8 shadow-xl shadow-black/5 border border-border"
              >
                <div className="mb-8 text-center">
                  <h2 className="text-2xl font-bold mb-2">New Session</h2>
                  <p className="text-muted-foreground">Configure your interval timer</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground/80">Interval Frequency</label>
                      <div className="relative">
                        <input
                          type="number"
                          {...register("intervalFrequency")}
                          className="w-full px-4 py-3 rounded-xl bg-secondary/50 border-2 border-transparent focus:border-primary focus:bg-background transition-all outline-none text-lg font-mono font-medium"
                          placeholder="5"
                        />
                        <span className="absolute right-4 top-3.5 text-xs text-muted-foreground font-semibold uppercase tracking-wider">Min</span>
                      </div>
                      {errors.intervalFrequency && <p className="text-xs text-destructive mt-1">{errors.intervalFrequency.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground/80">Timer</label>
                      <div className="relative">
                        <input
                          type="number"
                          {...register("timer")}
                          className="w-full px-4 py-3 rounded-xl bg-secondary/50 border-2 border-transparent focus:border-primary focus:bg-background transition-all outline-none text-lg font-mono font-medium"
                          placeholder="30"
                        />
                        <span className="absolute right-4 top-3.5 text-xs text-muted-foreground font-semibold uppercase tracking-wider">Min</span>
                      </div>
                      {errors.timer && <p className="text-xs text-destructive mt-1">{errors.timer.message}</p>}
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={!isValid || createSession.isPending}
                      className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-lg shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {createSession.isPending ? (
                        "Starting..."
                      ) : (
                        <>
                          <Play className="w-5 h-5 fill-current" /> Start Timer
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : (
              <motion.div 
                key="timer"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center"
              >
                <div className="mb-8 relative">
                  <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full transform scale-90"></div>
                  <CircularTimer 
                    progress={progress} 
                    size={320} 
                    strokeWidth={16}
                    color="hsl(var(--primary))"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-6xl font-mono font-bold tracking-tighter tabular-nums text-foreground">
                        {formatTime(Math.ceil(timeLeft))}
                      </span>
                      <span className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mt-2">
                        Remaining
                      </span>
                    </div>
                  </CircularTimer>
                </div>

                <div className="grid grid-cols-2 gap-8 w-full max-w-xs mb-8">
                  <div className="text-center p-4 rounded-2xl bg-secondary/30 backdrop-blur-sm border border-border/50">
                    <div className="text-2xl font-bold font-mono">{currentRep} <span className="text-sm font-sans text-muted-foreground font-normal">/ {Math.floor((activeConfig.timer * 60) / (activeConfig.intervalFrequency * 60))}</span></div>
                    <div className="text-xs uppercase tracking-wider font-bold text-muted-foreground mt-1">Repetition</div>
                  </div>
                  <div className="text-center p-4 rounded-2xl bg-secondary/30 backdrop-blur-sm border border-border/50">
                    <div className="text-2xl font-bold font-mono">{activeConfig.intervalFrequency} min</div>
                    <div className="text-xs uppercase tracking-wider font-bold text-muted-foreground mt-1">Interval</div>
                  </div>
                </div>

                <button
                  onClick={handleReset}
                  className="px-8 py-3 rounded-xl border-2 border-border font-semibold hover:bg-secondary hover:text-foreground transition-colors flex items-center gap-2 group"
                >
                  <RotateCcw className="w-4 h-4 group-hover:-rotate-180 transition-transform duration-500" />
                  Stop & Reset
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: History */}
        <div className="lg:col-span-5 flex flex-col h-full max-h-[600px]">
          <div className="flex items-center gap-2 mb-6">
            <History className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold">Recent Sessions</h3>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-sm flex-1 overflow-hidden flex flex-col">
            {isLoadingHistory ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground p-8">
                Loading history...
              </div>
            ) : !sessions?.length ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
                  <Bell className="w-6 h-6 opacity-50" />
                </div>
                <p>No sessions yet.</p>
                <p className="text-sm mt-1 opacity-70">Complete a timer to see it here.</p>
              </div>
            ) : (
              <div className="overflow-y-auto p-2 space-y-2 max-h-[500px]">
                {sessions.map((session, i) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-4 rounded-xl hover:bg-secondary/50 transition-colors border border-transparent hover:border-border/50 group"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium text-foreground flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-primary/40 group-hover:bg-primary transition-colors"></span>
                          {session.timer} min timer × {session.intervalFrequency} min intervals
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-md">
                          {session.createdAt && format(new Date(session.createdAt), 'MMM d, h:mm a')}
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
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
