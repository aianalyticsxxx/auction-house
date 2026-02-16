"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { UploadStep } from "@/components/create/UploadStep";
import { ConfigStep } from "@/components/create/ConfigStep";
import { useAuth } from "@/hooks/useAuth";
import { solToLamports } from "@/types";

// Loading skeleton shown during SSR and initial mount
function CreateSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 rounded w-48 mb-4" />
        <div className="h-5 bg-gray-200 rounded w-72 mb-8" />
        <div className="h-1 bg-gray-200 rounded mb-8" />
        <div className="h-64 bg-gray-200 rounded-card" />
      </div>
    </div>
  );
}

function CreateContent() {
  const router = useRouter();
  const { connected } = useWallet();
  const { user, isAuthenticated, signIn, isAuthenticating } = useAuth();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [reservePrice, setReservePrice] = useState(0);
  const [minBidIncrement, setMinBidIncrement] = useState(solToLamports(0.1));
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const handleSubmit = useCallback(async () => {
    if (!isAuthenticated || !user) {
      alert("Please sign in to create an auction");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: user.wallet_address,
          title,
          description,
          imageUrl,
          tags,
          reservePrice,
          minBidIncrement,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const details = Array.isArray(errorData.details)
          ? errorData.details.map((d: { field: string; message: string }) => `${d.field}: ${d.message}`).join("\n")
          : "";
        throw new Error(details || errorData.error || "Failed to create auction");
      }

      const { auction } = await response.json();
      router.push(`/auction/${auction.id}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to create auction");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isAuthenticated,
    user,
    title,
    description,
    imageUrl,
    tags,
    reservePrice,
    minBidIncrement,
    startTime,
    endTime,
    router,
  ]);

  // Not connected state
  if (!connected) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <h1 className="text-3xl font-bold mb-4">Create Auction</h1>
        <p className="text-gray-600 mb-8">
          Connect your wallet to create an auction.
        </p>
      </div>
    );
  }

  // Need to authenticate state
  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <h1 className="text-3xl font-bold mb-4">Create Auction</h1>
        <p className="text-gray-600 mb-8">
          Sign a message to verify your wallet and start creating.
        </p>
        <button
          onClick={signIn}
          disabled={isAuthenticating}
          className="px-8 py-3 bg-accent text-white rounded-button font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {isAuthenticating ? "Signing..." : "Sign In"}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create Auction</h1>
        <p className="text-gray-600">
          List your digital artwork for auction on Solana.
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        <div
          className={`flex-1 h-1 rounded-full ${
            step >= 1 ? "bg-accent" : "bg-gray-200"
          }`}
        />
        <div
          className={`flex-1 h-1 rounded-full ${
            step >= 2 ? "bg-accent" : "bg-gray-200"
          }`}
        />
      </div>

      {/* Steps */}
      {step === 1 && user && (
        <UploadStep
          imageUrl={imageUrl}
          title={title}
          description={description}
          tags={tags}
          walletAddress={user.wallet_address}
          onImageChange={setImageUrl}
          onTitleChange={setTitle}
          onDescriptionChange={setDescription}
          onTagsChange={setTags}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <ConfigStep
          reservePrice={reservePrice}
          minBidIncrement={minBidIncrement}
          startTime={startTime}
          endTime={endTime}
          onReservePriceChange={setReservePrice}
          onMinBidIncrementChange={setMinBidIncrement}
          onStartTimeChange={setStartTime}
          onEndTimeChange={setEndTime}
          onBack={() => setStep(1)}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}

export default function CreateAuctionPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Show skeleton during SSR and initial hydration
  if (!mounted) {
    return <CreateSkeleton />;
  }

  return <CreateContent />;
}
