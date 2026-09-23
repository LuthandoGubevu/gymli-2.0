import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center p-6 text-center">
      <div className="flex max-w-sm flex-col items-center gap-3">
        <span className="font-mono text-sm text-muted-foreground">404</span>
        <h1 className="font-display text-3xl font-bold">Nothing here</h1>
        <p className="text-muted-foreground">That page doesn&apos;t exist — maybe it moved.</p>
        <Link href="/app" className="mt-2 font-semibold">Back to the app</Link>
      </div>
    </main>
  );
}
