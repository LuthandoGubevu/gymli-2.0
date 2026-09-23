import type { Metadata } from "next";

export const metadata: Metadata = { title: "Offline" };

// Pre-cached by public/sw.js and served when a navigation fails with no network.
export default function Offline() {
  return (
    <main className="grid min-h-dvh place-items-center p-6 text-center">
      <div className="flex max-w-sm flex-col items-center gap-3">
        <h1 className="font-display text-3xl font-bold">You&apos;re offline</h1>
        <p className="text-muted-foreground">Check-ins, bookings and the crowd meter need a connection. We&apos;ll pick up where you left off once you&apos;re back online.</p>
        <a href="/app" className="mt-2 inline-flex h-11 items-center rounded-md bg-primary px-4 font-semibold text-primary-foreground no-underline hover:no-underline">Try again</a>
      </div>
    </main>
  );
}
