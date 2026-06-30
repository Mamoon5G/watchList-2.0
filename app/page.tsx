import { AuthPanel } from '@/components/AuthPanel';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Film } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-400/20 dark:bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-400/20 dark:bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />
      
      <header className="p-6 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl flex items-center justify-center shadow-lg">
            <Film className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Watchly</h1>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tighter">Your public watchlist</h2>
            <p className="text-neutral-500 dark:text-neutral-400">Manage and share what you're watching, reading, and planning to consume.</p>
          </div>
          <AuthPanel />
        </div>
      </main>
    </div>
  );
}
