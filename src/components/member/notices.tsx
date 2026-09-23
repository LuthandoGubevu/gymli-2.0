"use client";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Inbox, Megaphone, Trash2 } from "lucide-react";
import { useMe } from "@/components/providers/auth";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageHeader, Skeleton } from "@/components/ui/bits";
import { Field, errProps } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { useNoticeState } from "@/hooks/use-unread";
import { deleteNotice, markNoticeRead, markNoticesRead, postNotice } from "@/lib/actions/notices";
import { relativeTime } from "@/lib/dates";
import { toast, toastError } from "@/lib/toast";
import { NOTICE_TAGS, type NoticeTag } from "@/lib/types";
import { cn, errorMessage, fullName } from "@/lib/utils";

const schema = z.object({
  title: z.string().trim().min(4, "Give it a title (4+ characters).").max(120),
  body: z.string().trim().min(10, "Add a little more detail (10+ characters).").max(4000),
  tag: z.enum(NOTICE_TAGS as [NoticeTag, ...NoticeTag[]]),
});
type Values = z.infer<typeof schema>;

function Composer() {
  const { me, gymId } = useMe();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { title: "", body: "", tag: "GENERAL" } });
  const onSubmit = async (v: Values) => {
    try {
      await postNotice(gymId, { uid: me.uid, name: fullName(me) || "Front desk" }, v);
      reset();
      toast("Posted — every member will see it on their home screen", "megaphone", "accent");
    } catch (e) { toastError(errorMessage(e)); }
  };
  return (
    <Card className="gap-4">
      <h2 className="font-display text-base font-semibold">Post a notice</h2>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
          <Field label="Title" htmlFor="n-title" error={errors.title?.message}>
            <Input placeholder="e.g. Pool closed for maintenance" className="h-11 bg-background" {...errProps("n-title", errors.title?.message)} {...register("title")} />
          </Field>
          <Field label="Tag" htmlFor="n-tag">
            <NativeSelect id="n-tag" className="h-11 bg-background font-mono text-sm" {...register("tag")}>
              {NOTICE_TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
            </NativeSelect>
          </Field>
        </div>
        <Field label="Message" htmlFor="n-body" error={errors.body?.message}>
          <Textarea rows={3} placeholder="What do members need to know?" className="bg-background" {...errProps("n-body", errors.body?.message)} {...register("body")} />
        </Field>
        <Button type="submit" size="lg" glow disabled={isSubmitting} className="self-start"><Megaphone size={18} aria-hidden />{isSubmitting ? "Posting…" : "Post to all members"}</Button>
      </form>
    </Card>
  );
}

export function NoticesPage({ adminView }: { adminView?: boolean }) {
  const { me, gymId, isAdmin } = useMe();
  const { notices, loading, isUnread, unreadIds } = useNoticeState(me);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={adminView ? "Admin · Notices" : "Notices"} title="From the front desk" actions={
        unreadIds.length && !adminView ? <Button variant="outline" size="md" onClick={() => markNoticesRead(me.uid, unreadIds).catch((e) => toastError(errorMessage(e)))}>Mark all read</Button> : undefined
      } />
      {isAdmin ? <Composer /> : null}
      {loading ? <Skeleton className="h-48 rounded-xl" /> : notices.length ? (
        <ul className="flex flex-col gap-3">
          {notices.map((n) => {
            const unread = !adminView && isUnread(n);
            return (
              <li key={n.id} id={n.id} className="scroll-mt-24">
                <article
                  className={cn("surface surface-hover flex gap-4 px-6 py-[22px]", unread && "border-primary/35")}
                  onClick={() => { if (unread) markNoticeRead(me.uid, n.id).catch(() => {}); }}
                  onKeyDown={(e) => { if (unread && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); markNoticeRead(me.uid, n.id).catch(() => {}); } }}
                  tabIndex={unread ? 0 : undefined}
                  aria-label={unread ? `${n.title} (unread — press to mark read)` : undefined}
                >
                  <span className={cn("mt-2 h-2 w-2 flex-none rounded-full", unread ? "bg-primary" : "bg-muted")} aria-hidden />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span className="rounded-md bg-elevated px-2 py-[3px] font-mono text-[11px] font-medium tracking-[.04em] text-muted-foreground">{n.tag ?? "GENERAL"}</span>
                      <h2 className="font-display text-[17px] font-semibold">{n.title}</h2>
                    </div>
                    <p className="whitespace-pre-line text-[15px] leading-[1.55] text-muted-foreground [text-wrap:pretty]">{n.body}</p>
                    <span className="font-mono text-xs text-muted-foreground">{n.authorName} · {n.createdAt ? relativeTime(n.createdAt.toDate()) : "Just now"}</span>
                  </div>
                  {isAdmin ? (
                    <Button variant="ghost" size="icon" aria-label={`Delete notice: ${n.title}`} onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete "${n.title}" for all members?`)) deleteNotice(gymId, n.id).then(() => toast("Notice deleted", "x", "muted")).catch((err) => toastError(errorMessage(err)));
                    }}><Trash2 size={17} /></Button>
                  ) : null}
                </article>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={<Inbox size={26} />} title="You're all caught up" sub="Closures, promos and schedule changes from your gym land here." action={
          <Button asChild variant="outline" size="lg"><Link href="/app/classes">Browse this week&apos;s classes</Link></Button>
        } />
      )}
    </div>
  );
}
