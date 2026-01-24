"use client";

import dynamic from "next/dynamic";
import { useWallet } from "@solana/wallet-adapter-react";

// Dynamic import to avoid hydration mismatch - wallet adapter checks for browser extensions
const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((mod) => mod.WalletMultiButton),
  { ssr: false, loading: () => <WalletButtonSkeleton /> }
);

function WalletButtonSkeleton() {
  return (
    <div className="h-10 w-32 bg-gray-200 rounded-full animate-pulse" />
  );
}

export function WalletButton() {
  const { connected } = useWallet();

  return (
    <div className="wallet-button-wrapper">
      <WalletMultiButton
        style={{
          backgroundColor: connected ? "#1a1a2e" : "#9945FF",
          borderRadius: "9999px",
          height: "40px",
          padding: "0 20px",
          fontSize: "14px",
          fontWeight: 500,
        }}
      />
    </div>
  );
}
