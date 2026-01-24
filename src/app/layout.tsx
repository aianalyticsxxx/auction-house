import type { Metadata } from "next";
import { Footer } from "@/components/layout/Footer";
import { ClientLayout } from "@/components/layout/ClientLayout";
import "./globals.css";

export const metadata: Metadata = {
  title: "Art Auction | Digital Art on Solana",
  description:
    "A curated auction platform for digital art on Solana. Discover, bid, and collect.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col antialiased">
        <ClientLayout>{children}</ClientLayout>
        <Footer />
      </body>
    </html>
  );
}
