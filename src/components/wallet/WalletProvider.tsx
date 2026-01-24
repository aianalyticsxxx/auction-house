"use client";

import { FC, ReactNode, useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import { MockWalletAdapter } from "./MockWalletAdapter";

import "@solana/wallet-adapter-react-ui/styles.css";

interface Props {
  children: ReactNode;
}

export const WalletProvider: FC<Props> = ({ children }) => {
  const endpoint = useMemo(() => {
    return process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl("devnet");
  }, []);

  // Create wallets - empty array on SSR to minimize hydration issues
  const wallets = useMemo(() => {
    if (typeof window === "undefined") {
      return [];
    }
    // eslint-disable-next-line
    const isTestMode = !!(window as any).__WALLET_ADAPTER_OVERRIDE__;
    if (isTestMode) {
      return [new MockWalletAdapter()];
    }
    return [new PhantomWalletAdapter(), new SolflareWalletAdapter()];
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment: "confirmed" }}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};
