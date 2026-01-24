"use client";

import { ReactNode, useState, useEffect } from "react";
import { WalletProvider } from "@/components/wallet/WalletProvider";
import { Header } from "@/components/layout/Header";
import { NotificationToast } from "@/components/notifications/NotificationToast";

interface ClientLayoutProps {
  children: ReactNode;
}

// Loading skeleton that matches the header structure
function HeaderSkeleton() {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between py-4">
        <div className="flex items-center gap-8">
          <div className="w-10 h-10 rounded-xl bg-gray-200 animate-pulse" />
          <div className="hidden md:flex items-center gap-4">
            <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="flex-1 max-w-md mx-4 hidden sm:block">
          <div className="h-10 bg-gray-100 rounded-full animate-pulse" />
        </div>
        <div className="flex items-center gap-4">
          <div className="h-10 w-32 bg-gray-200 rounded-full animate-pulse" />
        </div>
      </div>
    </header>
  );
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // On server and initial client render, show skeleton
  if (!mounted) {
    return (
      <>
        <HeaderSkeleton />
        <main className="flex-1">{children}</main>
      </>
    );
  }

  // Once mounted on client, render full app with wallet provider
  return (
    <WalletProvider>
      <Header />
      <main className="flex-1">{children}</main>
      <NotificationToast />
    </WalletProvider>
  );
}
