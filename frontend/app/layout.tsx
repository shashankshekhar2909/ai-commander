import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "AI Commander | Build with Shashank",
  description: "Mission control dashboard by Build with Shashank tracking AI tasks, prompts history, and agent transcripts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-[#0b0f17] text-slate-100 min-h-screen flex flex-col font-sans selection:bg-blue-600/30 selection:text-blue-200">
        <Navbar />
        <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-6 space-y-6">
          {children}
        </main>
        <footer className="border-t border-slate-800/80 py-3 px-6 text-center text-xs text-slate-500 font-mono flex items-center justify-between">
          <span>AI Commander Telemetry Engine v1.2 &bull; <strong>Build with Shashank</strong></span>
          <a href="https://www.buildwithshashank.com/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">
            https://www.buildwithshashank.com/
          </a>
        </footer>
      </body>
    </html>
  );
}
