import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        {/* 404 Icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-bg-secondary flex items-center justify-center border border-border-subtle">
          <svg
            className="w-10 h-10 text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="font-display text-2xl text-text-primary mb-3">
          Page not found
        </h1>

        {/* Description */}
        <p className="text-text-muted mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-3 bg-accent text-white font-semibold rounded-button hover:bg-accent/90 transition-colors"
          >
            Go home
          </Link>
          <Link
            href="/#explore"
            className="px-6 py-3 bg-bg-secondary text-text-primary font-semibold rounded-button hover:bg-bg-elevated transition-colors"
          >
            Explore auctions
          </Link>
        </div>
      </div>
    </div>
  );
}
