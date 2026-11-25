export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="max-w-md rounded-lg border border-border bg-background p-8 text-center">
        <div className="mb-6 inline-flex size-16 items-center justify-center rounded-full bg-secondary">
          <svg className="size-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16H5m13 0h2.888M5 12h2m12 0h2M5 8h2m12 0h2" />
          </svg>
        </div>
        <h1 className="mb-2 text-2xl font-bold">You're Offline</h1>
        <p className="mb-6 text-muted-foreground">It looks like you've lost your internet connection. Some features are limited, but you can still browse cached pages.</p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
