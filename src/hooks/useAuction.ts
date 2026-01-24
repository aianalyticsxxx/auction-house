"use client";

import { useState, useEffect, useCallback } from "react";
import type { Auction, Bid } from "@/types";

interface AuctionWithBids extends Auction {
  bids: Bid[];
}

interface UseAuctionReturn {
  auction: AuctionWithBids | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAuction(auctionId: string): UseAuctionReturn {
  const [auction, setAuction] = useState<AuctionWithBids | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAuction = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = await fetch(`/api/auctions/${auctionId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Auction not found");
        }
        throw new Error("Failed to fetch auction");
      }

      const data = await response.json();
      setAuction(data.auction);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [auctionId]);

  // Initial fetch
  useEffect(() => {
    fetchAuction(true);
  }, [fetchAuction]);

  // Poll for updates on live auctions (silent refresh)
  useEffect(() => {
    if (auction?.status !== "current") return;

    const interval = setInterval(() => fetchAuction(false), 5000);
    return () => clearInterval(interval);
  }, [auction?.status, fetchAuction]);

  return {
    auction,
    isLoading,
    error,
    refetch: fetchAuction,
  };
}
