import * as React from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function Card({ className, interactive, ...props }: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return <div className={cn("surface flex flex-col p-6", interactive && "surface-hover cursor-pointer", className)} {...props} />;
}

/** A card that is also a link (dashboard crowd/rank/badge cards). */
export function CardLink({ href, className, children, label }: { href: string; className?: string; children: React.ReactNode; label: string }) {
  return (
    <Link href={href} aria-label={label} className={cn("surface surface-hover flex flex-col p-6 text-foreground no-underline hover:no-underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/40", className)}>
      {children}
    </Link>
  );
}

export function Eyebrow({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("eyebrow", className)} {...props} />;
}

export function CardHead({ title, right, as: As = "h2" }: { title: React.ReactNode; right?: React.ReactNode; as?: "h2" | "h3" }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <As className="eyebrow">{title}</As>
      {right ? <span className="font-mono text-xs text-muted-foreground">{right}</span> : null}
    </div>
  );
}

export function PageHeader({ eyebrow, title, sub, actions }: { eyebrow: React.ReactNode; title: React.ReactNode; sub?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-[18px]">
      <div className="flex min-w-0 flex-col gap-2">
        <span className="eyebrow">{eyebrow}</span>
        <h1 className="page-title">{title}</h1>
        {sub ? <p className="text-[15px] leading-normal text-muted-foreground">{sub}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
    </div>
  );
}

/** Progress/meter bar. Width glides (700ms) and colour cross-fades (400ms). */
export function Meter({ value, color = "hsl(var(--primary))", className, label, height = 8 }: { value: number; color?: string; className?: string; label?: string; height?: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("overflow-hidden rounded-full bg-muted", className)} style={{ height }} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="h-full rounded-full transition-[width,background-color] duration-700 ease-meter" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

export function EmptyState({ icon, title, sub, action, className }: { icon: React.ReactNode; title: string; sub?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("empty-card", className)}>
      <span className="grid h-14 w-14 place-items-center rounded-xl bg-elevated text-muted-foreground" aria-hidden>{icon}</span>
      <span className="font-display text-lg font-semibold">{title}</span>
      {sub ? <span className="max-w-[340px] text-sm text-muted-foreground">{sub}</span> : null}
      {action}
    </div>
  );
}

export function MiniEmpty({ icon, text, action }: { icon: React.ReactNode; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-start gap-2.5 py-2">
      <span className="grid h-11 w-11 place-items-center rounded-lg bg-elevated text-muted-foreground" aria-hidden>{icon}</span>
      <span className="text-[15px] font-medium">{text}</span>
      {action}
    </div>
  );
}

export function Avatar({ initials, size = 36, ring, className, photoURL }: { initials: string; size?: number; ring?: boolean; className?: string; photoURL?: string }) {
  return (
    <span
      aria-hidden
      className={cn("grid flex-none place-items-center overflow-hidden rounded-full bg-elevated font-display font-semibold", ring ? "border-2 border-primary" : "border border-border", className)}
      style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.34)) }}
    >
      {photoURL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoURL} alt="" className="h-full w-full object-cover" />
      ) : initials}
    </span>
  );
}

export function Pill({ className, dot, children }: { className?: string; dot?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-[7px] rounded-full border px-2.5 py-1 text-[13px] font-semibold transition-colors [transition-duration:400ms]", className)}>
      {dot ? <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} aria-hidden /> : null}
      {children}
    </span>
  );
}

export function LiveBadge() {
  return (
    <span className="flex items-center gap-[7px] font-mono text-[11px] font-medium tracking-[.06em] text-success">
      <span className="live-dot" aria-hidden />LIVE
    </span>
  );
}

export function Spinner({ className, label = "Loading" }: { className?: string; label?: string }) {
  return <LoaderCircle className={cn("animate-spin text-muted-foreground", className)} size={20} aria-label={label} role="status" />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} aria-hidden />;
}

export function StatTile({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-[10px] border border-border bg-background p-3">
      <span className="font-display text-2xl font-bold leading-none">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
