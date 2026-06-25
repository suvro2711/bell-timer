import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import AnalysisPage from "@/pages/Analysis";
import SettingsPage from "@/pages/Settings";
import AboutPage from "@/pages/About";
import NotFound from "@/pages/not-found";
import StatisticsPage from "./pages/Statistics";
import Activities from "./pages/Activities";
import ActivityManager from "./pages/ActivityManager";
import LoginPage from "./pages/Login";
import NiharikaPage from "./pages/Niharika";
import { useAuth } from "./hooks/use-auth";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/history" component={AnalysisPage} />
      <Route path="/analysis" component={StatisticsPage} />
      <Route path="/activities" component={Activities} />
      <Route path="/activity-manager" component={ActivityManager} />
      <Route path="/niharika" component={NiharikaPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/about" component={AboutPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthGate() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <>
      <Router />
      <Toaster />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthGate />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
