import { useTimerSessions, useDeleteTimerSession } from "@/hooks/use-timer-sessions";
import { Clock, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { SessionsTable } from "@/components/SessionsTable";
import { TimerStats } from "@/components/TimerStats";
import { ActivityStats } from "@/components/ActivityStats/ActivityStats";
import { SleepActivity } from "@/components/Activties/sleep/SleepActivity";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AnalysisPage() {
  const { data: sessions, isLoading } = useTimerSessions();
  const deleteSession = useDeleteTimerSession();
  const { toast } = useToast();

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
            <h1 className="text-xl font-bold tracking-tight"> Analysis</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-8">
        <Tabs defaultValue="sessions" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="stats">Timer Stats</TabsTrigger>
            <TabsTrigger value="activities">Activity Analysis</TabsTrigger>
            <TabsTrigger value="sleep">Sleep</TabsTrigger>
          </TabsList>
          
          <TabsContent value="sessions">
            <SessionsTable
              sessions={sessions || []}
              isLoading={isLoading}
              onDelete={handleDeleteSession}
            />
          </TabsContent>
          
          <TabsContent value="stats">
            <TimerStats
              sessions={sessions || []}
              isLoading={isLoading}
            />
          </TabsContent>
          
          <TabsContent value="activities">
            <ActivityStats />
          </TabsContent>

          <TabsContent value="sleep">
            <SleepActivity />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
