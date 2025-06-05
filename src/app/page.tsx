
import ChatInterface from '@/components/chat/ChatInterface';

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 md:p-8 bg-background font-body">
      <div className="w-full max-w-4xl space-y-8">
        {/* The EligibilityCheckWrapper and its separate UI are removed. ChatInterface handles all interactions. */}
        <div className="h-[80vh] md:h-[calc(100vh-10rem)]"> {/* Adjusted height for primary chat focus */}
          <ChatInterface />
        </div>
      </div>
    </main>
  );
}
