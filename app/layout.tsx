import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "CEO Command Center | OpenClaw",
  description: "Advanced Agentic Orchestration Dashboard",
};

import { MobileNav } from "@/components/MobileNav";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#0f1115] text-slate-200">
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <MobileNav />
        <main className="md:pl-64 min-h-screen pt-4 md:pt-0">
          {children}
        </main>
      </body>
    </html>
  );
}
