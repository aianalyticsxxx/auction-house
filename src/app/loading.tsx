import { AuctionCardSkeleton } from "@/components/auction/AuctionCard";

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Hero Section Skeleton */}
      <div className="mb-16">
        <div className="h-12 animate-shimmer rounded-lg w-2/3 max-w-xl mb-4" />
        <div className="h-6 animate-shimmer rounded-lg w-1/2 max-w-md" />
      </div>

      {/* Filters Skeleton */}
      <div className="flex gap-3 mb-8">
        <div className="h-10 animate-shimmer rounded-button w-24" />
        <div className="h-10 animate-shimmer rounded-button w-28" />
        <div className="h-10 animate-shimmer rounded-button w-20" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <AuctionCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
