import { ArrowLeft, Clock } from "lucide-react";
import { Link } from "wouter";

export default function SettingsPage() {
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
            <h1 className="text-xl font-bold tracking-tight">Settings</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-8">
        <div className="bg-card rounded-3xl border border-border shadow-xl p-6">
          <h2 className="text-2xl font-bold mb-6">App Settings</h2>
          
          <div className="space-y-6">
            <div className="p-4 rounded-xl border border-border">
              <h3 className="font-semibold mb-2">PIN Protection</h3>
              <p className="text-sm text-muted-foreground">
                PIN is configured via environment variables for security.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border">
              <h3 className="font-semibold mb-2">Data Storage</h3>
              <p className="text-sm text-muted-foreground">
                Session data is automatically synced to Google Sheets.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border">
              <h3 className="font-semibold mb-2">PWA Features</h3>
              <p className="text-sm text-muted-foreground">
                This app can be installed on your device for offline access.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
