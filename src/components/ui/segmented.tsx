"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

interface Option<T extends string> { value: T; label: React.ReactNode; sub?: React.ReactNode }

interface SegmentedProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
  className?: string;
  itemClassName?: string;
  /** Grid layout (e.g. day tabs) instead of inline pills. */
  grid?: boolean;
}

/** Segmented control. Active item uses the elevated surface. Arrow keys move selection. */
export function Segmented<T extends string>({ options, value, onChange, ariaLabel, className, itemClassName, grid }: SegmentedProps<T>) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (i + d + options.length) % options.length;
    onChange(options[n].value);
    refs.current[n]?.focus();
  };
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "no-scrollbar max-w-full gap-1 overflow-x-auto rounded-[10px] border border-border bg-card p-1",
        grid ? "grid" : "flex w-fit",
        className,
      )}
      style={grid ? { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` } : undefined}
    >
      {options.map((o, i) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              "flex-none whitespace-nowrap rounded-[7px] px-4 text-sm font-medium transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              o.sub ? "flex flex-col items-center gap-[3px] px-1 py-2.5" : "h-[38px]",
              active ? "bg-elevated text-foreground" : "text-muted-foreground hover:text-foreground",
              itemClassName,
            )}
          >
            <span className={o.sub ? "font-semibold" : undefined}>{o.label}</span>
            {o.sub ? <span className="font-mono text-xs font-normal opacity-85">{o.sub}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
