"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { collection, limit, orderBy, query } from "firebase/firestore";
import { ArrowLeft, Send } from "lucide-react";
import { useMe } from "@/components/providers/auth";
import { Avatar, EmptyState, Spinner } from "@/components/ui/bits";
import { useDoc, useQuery } from "@/hooks/use-firestore";
import { sendMessage } from "@/lib/actions/buddy";
import { timeHHmm, relativeTime } from "@/lib/dates";
import { P } from "@/lib/paths";
import { toastError } from "@/lib/toast";
import type { BuddyMatch, BuddyMessage } from "@/lib/types";
import { cn, errorMessage, initialsFromName } from "@/lib/utils";

export function BuddyChat({ matchId }: { matchId: string }) {
  const { me, gymId } = useMe();
  const match = useDoc<BuddyMatch>(P.match(gymId, matchId));
  const msgs = useQuery<BuddyMessage>(match.data ? `msgs:${gymId}:${matchId}` : null, (db) => query(collection(db, P.messages(gymId, matchId)), orderBy("createdAt", "asc"), limit(300)));
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgs.data.length]);

  if (match.loading) return <div className="grid place-items-center py-20"><Spinner /></div>;
  if (!match.data) return <EmptyState icon={<ArrowLeft size={26} />} title="Chat not found" sub="This match doesn't exist or isn't yours." action={<Link href="/app/buddy">Back to Gym Buddy</Link>} />;

  const other = match.data.members.find((u) => u !== me.uid) ?? "";
  const name = match.data.memberNames?.[other] ?? "Your match";

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try { await sendMessage(gymId, matchId, me.uid, text); setText(""); } catch (err) { toastError(errorMessage(err)); } finally { setSending(false); }
  };

  return (
    <div className="mx-auto flex h-[calc(100dvh-60px-96px-52px)] max-w-[720px] flex-col gap-4 nav:h-[calc(100dvh-36px-56px)]">
      <div className="flex items-center gap-3">
        <Link href="/app/buddy" aria-label="Back to Gym Buddy" className="grid h-10 w-10 place-items-center rounded-md border border-border text-muted-foreground hover:text-foreground"><ArrowLeft size={18} /></Link>
        <Avatar initials={initialsFromName(name)} size={40} />
        <div className="flex flex-col">
          <h1 className="font-display text-lg font-semibold leading-tight">{name}</h1>
          <span className="font-mono text-xs text-muted-foreground">Matched {match.data.createdAt ? relativeTime(match.data.createdAt.toDate()).toLowerCase() : "just now"}</span>
        </div>
      </div>
      <div className="surface flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-4" role="log" aria-live="polite" aria-label={`Conversation with ${name}`}>
        {msgs.data.length === 0 ? (
          <p className="m-auto max-w-[280px] text-center text-sm text-muted-foreground">You matched! Suggest a session — {name.split(" ")[0]} will see it next time they open the app.</p>
        ) : msgs.data.map((m) => {
          const mine = m.senderId === me.uid;
          return (
            <div key={m.id} className={cn("flex max-w-[80%] flex-col gap-1", mine ? "self-end items-end" : "self-start items-start")}>
              <span className={cn("rounded-2xl px-3.5 py-2 text-[15px] leading-normal", mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-elevated")}>{m.text}</span>
              <span className="font-mono text-[11px] text-muted-foreground">{m.createdAt ? timeHHmm(m.createdAt.toDate(), Intl.DateTimeFormat().resolvedOptions().timeZone) : "sending…"}</span>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="flex gap-2">
        <label htmlFor="chat-input" className="sr-only">Message</label>
        <input id="chat-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} autoComplete="off" placeholder={`Message ${name.split(" ")[0]}`}
          className="h-12 flex-1 rounded-md border border-border bg-card px-4 text-[15px] outline-none focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/.22)]" />
        <button type="submit" disabled={!text.trim() || sending} aria-label="Send" className="grid h-12 w-12 place-items-center rounded-md bg-primary text-primary-foreground disabled:opacity-50"><Send size={18} /></button>
      </form>
    </div>
  );
}
