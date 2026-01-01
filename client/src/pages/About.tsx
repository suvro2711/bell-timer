import { ArrowLeft, Clock, Bell, Calendar, Shield } from "lucide-react";
import { Link } from "wouter";

export default function AboutPage() {
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
            <h1 className="text-xl font-bold tracking-tight">About</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-8">
        <div className="bg-card rounded-3xl border border-border shadow-xl p-6 md:p-8">
          <div className="text-center mb-8">
            <div className="inline-flex p-4 bg-primary/10 rounded-2xl mb-4">
              <Clock className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-3xl font-bold mb-2">FocusLoop</h2>
            <p className="text-muted-foreground">Interval Training Timer</p>
            <p className="text-sm text-muted-foreground mt-2">Version 1.0.0</p>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold mb-4">Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-border flex gap-3">
                  <Bell className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Bell Notifications</h4>
                    <p className="text-sm text-muted-foreground">
                      Audio alerts at each interval
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-border flex gap-3">
                  <Calendar className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Session History</h4>
                    <p className="text-sm text-muted-foreground">
                      Track all your timer sessions
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-border flex gap-3">
                  <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">PIN Protection</h4>
                    <p className="text-sm text-muted-foreground">
                      Secure access to your timer
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-border flex gap-3">
                  <Clock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">PWA Support</h4>
                    <p className="text-sm text-muted-foreground">
                      Install as mobile app
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-3">How to Use</h3>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="font-bold text-foreground">1.</span>
                  <span>Set the timer duration (in minutes)</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-foreground">2.</span>
                  <span>Set the interval frequency (bell rings every X minutes)</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-foreground">3.</span>
                  <span>Click "Start Timer" to begin your session</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-foreground">4.</span>
                  <span>Listen for the bell at each interval</span>
                </li>
              </ol>
            </div>

            <div className="pt-6 border-t border-border text-center text-sm text-muted-foreground">
              <p>Built with React, TypeScript, and Express</p>
              <p className="mt-2">© 2026 FocusLoop. All rights reserved.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
