"use client";
import { useMemo, useState } from "react";
import { EllipsisVertical, Pencil, Plus, Trash2, Trophy } from "lucide-react";
import { useMe } from "@/components/providers/auth";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Skeleton } from "@/components/ui/bits";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { usePRs } from "@/hooks/use-data";
import { deletePR, round1 } from "@/lib/actions/records";
import { fmtKey } from "@/lib/dates";
import { toast, toastError } from "@/lib/toast";
import type { PersonalRecord } from "@/lib/types";
import { errorMessage } from "@/lib/utils";
import { PRDialog } from "./pr-dialog";
import { ProgressTabs } from "./progress-tabs";

const delta = (p: PersonalRecord) => (p.previousValue != null ? round1(p.value - p.previousValue) : null);

export function RecordsPage() {
  const { me, gymId } = useMe();
  const prs = usePRs(gymId, me.uid);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PersonalRecord | null>(null);
  const rows = useMemo(() => [...prs.data].sort((a, b) => b.date.localeCompare(a.date)), [prs.data]);

  const remove = async (p: PersonalRecord) => {
    if (!window.confirm(`Delete your ${p.exercise} record? This can't be undone.`)) return;
    try { await deletePR(gymId, me.uid, p.id); toast(`Deleted ${p.exercise}`, "x", "muted"); } catch (e) { toastError(errorMessage(e)); }
  };

  return (
    <div className="flex flex-col gap-6">
      <ProgressTabs />
      <PageHeader eyebrow="Personal records" title="Your all-time bests" actions={
        <Button size="xl" glow onClick={() => { setEditing(null); setOpen(true); }}><Plus size={18} strokeWidth={2.5} aria-hidden />Log a PR</Button>
      } />
      {prs.loading ? <Skeleton className="h-40 rounded-xl" /> : rows.length ? (
        <>
          <ul className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))]">
            {rows.slice(0, 3).map((p) => {
              const d = delta(p);
              return (
                <li key={p.id} className="surface flex flex-col gap-3 p-[22px]">
                  <span className="text-sm font-medium text-muted-foreground">{p.exercise}</span>
                  <div className="flex items-baseline gap-1.5"><span className="num font-display text-5xl font-bold leading-[.9]">{p.value}</span><span className="font-display text-base font-medium text-muted-foreground">{p.unit}</span></div>
                  <span className={d != null ? "font-mono text-xs font-medium text-success" : "font-mono text-xs font-medium text-muted-foreground"}>{d != null ? `+${d} ${p.unit} vs previous` : "First logged"}</span>
                </li>
              );
            })}
          </ul>
          <div className="surface overflow-hidden">
            <table className="w-full">
              <caption className="sr-only">All personal records</caption>
              <thead>
                <tr className="border-b border-border font-mono text-[11px] font-medium uppercase tracking-[.08em] text-muted-foreground">
                  <th scope="col" className="px-[22px] py-3.5 text-left font-medium">Exercise</th>
                  <th scope="col" className="px-2 py-3.5 text-left font-medium">Best</th>
                  <th scope="col" className="hidden px-2 py-3.5 text-left font-medium sm:table-cell">Date</th>
                  <th scope="col" className="px-2 py-3.5 text-right font-medium">Change</th>
                  <th scope="col" className="w-12 py-3.5 pr-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const d = delta(p);
                  return (
                    <tr key={p.id} className="border-b border-border transition-colors last:border-0 hover:bg-elevated">
                      <td className="max-w-0 truncate px-[22px] py-4 text-[15px] font-semibold">{p.exercise}<span className="block font-mono text-xs font-normal text-muted-foreground sm:hidden">{fmtKey(p.date)}</span></td>
                      <td className="whitespace-nowrap px-2 py-4 font-mono text-[15px] font-medium">{p.value} {p.unit}</td>
                      <td className="hidden whitespace-nowrap px-2 py-4 font-mono text-[13px] text-muted-foreground sm:table-cell">{fmtKey(p.date)}</td>
                      <td className={d != null ? "px-2 py-4 text-right font-mono text-[13px] font-medium text-success" : "px-2 py-4 text-right font-mono text-[13px] font-medium text-muted-foreground"}>{d != null ? `+${d}` : "New"}</td>
                      <td className="py-2 pr-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger aria-label={`Actions for ${p.exercise}`} className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:text-foreground"><EllipsisVertical size={18} /></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => { setEditing(p); setOpen(true); }}><Pencil size={15} aria-hidden />Edit</DropdownMenuItem>
                            <DropdownMenuItem destructive onSelect={() => remove(p)}><Trash2 size={15} aria-hidden />Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <EmptyState icon={<Trophy size={26} />} title="No PRs logged yet" sub="Log your first lift and every kilo from here gets measured against it." action={<Button size="lg" onClick={() => setOpen(true)}>Log your first PR</Button>} />
      )}
      <PRDialog open={open} onOpenChange={setOpen} prs={prs.data} editing={editing} />
    </div>
  );
}
