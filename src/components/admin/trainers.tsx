"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dumbbell, Pencil, Plus, Trash2 } from "lucide-react";
import { useMe } from "@/components/providers/auth";
import { Button } from "@/components/ui/button";
import { Avatar, EmptyState, PageHeader, Skeleton } from "@/components/ui/bits";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, FieldError, errProps } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { SubTabs } from "@/components/member/progress-tabs";
import { useTrainers } from "@/hooks/use-data";
import { deleteTrainer, saveTrainer } from "@/lib/actions/admin";
import { toast, toastError } from "@/lib/toast";
import type { Trainer } from "@/lib/types";
import { errorMessage, initialsFromName } from "@/lib/utils";
import { MANAGE_TABS } from "./tabs";

const schema = z.object({
  name: z.string().trim().min(2, "Name needs 2+ characters.").max(60),
  specialties: z.string().trim().max(200),
  availability: z.string().trim().max(120),
  bio: z.string().trim().max(400),
  avatarUrl: z.union([z.literal(""), z.url("Enter a full https:// image URL.")]),
});
type Values = z.infer<typeof schema>;
const EMPTY: Values = { name: "", specialties: "", availability: "", bio: "", avatarUrl: "" };

export function TrainersAdmin() {
  const { gymId } = useMe();
  const trainers = useTrainers(gymId);
  const [editing, setEditing] = useState<Trainer | "new" | null>(null);
  const [formError, setFormError] = useState("");
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: EMPTY });
  const open = (t: Trainer | "new") => { setFormError(""); reset(t === "new" ? EMPTY : { name: t.name, specialties: t.specialties.join(", "), availability: t.availability, bio: t.bio ?? "", avatarUrl: t.avatarUrl ?? "" }); setEditing(t); };
  const onSubmit = async (v: Values) => {
    try {
      await saveTrainer(gymId, editing === "new" || !editing ? null : editing.id, { ...v, specialties: v.specialties.split(",").map((s) => s.trim()).filter(Boolean) });
      setEditing(null); toast(`Saved ${v.name}`, "check", "success");
    } catch (e) { setFormError(errorMessage(e)); }
  };
  return (
    <div className="flex flex-col gap-6">
      <SubTabs tabs={MANAGE_TABS} label="Manage" />
      <PageHeader eyebrow="Admin · Trainers" title="Your coaching team" actions={<Button size="xl" onClick={() => open("new")}><Plus size={18} aria-hidden />Add trainer</Button>} />
      {trainers.loading ? <Skeleton className="h-40 rounded-xl" /> : trainers.data.length ? (
        <ul className="auto-grid">
          {trainers.data.map((t) => (
            <li key={t.id} className="surface flex flex-col gap-3 p-6">
              <div className="flex items-center gap-3"><Avatar initials={initialsFromName(t.name)} size={44} photoURL={t.avatarUrl} /><div className="flex min-w-0 flex-1 flex-col"><span className="font-semibold">{t.name}</span><span className="truncate font-mono text-xs text-muted-foreground">{t.availability}</span></div></div>
              <span className="text-sm text-muted-foreground">{t.specialties.join(" · ")}</span>
              <div className="mt-auto flex gap-1">
                <Button variant="outline" size="sm" onClick={() => open(t)}><Pencil size={14} aria-hidden />Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => { if (window.confirm(`Remove ${t.name}?`)) deleteTrainer(gymId, t.id).then(() => toast(`Removed ${t.name}`, "x", "muted")).catch((e) => toastError(errorMessage(e))); }}><Trash2 size={14} aria-hidden />Remove</Button>
              </div>
            </li>
          ))}
        </ul>
      ) : <EmptyState icon={<Dumbbell size={26} />} title="No trainers yet" sub="Add trainers so members can request personal sessions." action={<Button size="lg" onClick={() => open("new")}>Add a trainer</Button>} />}
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent title={editing === "new" ? "Add a trainer" : "Edit trainer"}>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Field label="Name" htmlFor="t-name" error={errors.name?.message}><Input className="bg-background" {...errProps("t-name", errors.name?.message)} {...register("name")} /></Field>
            <Field label="Specialties" htmlFor="t-spec" hint="Comma-separated, e.g. Strength, Mobility"><Input id="t-spec" className="bg-background" {...register("specialties")} /></Field>
            <Field label="Availability" htmlFor="t-av" hint="e.g. Mon–Thu, 06:00–10:00"><Input id="t-av" className="bg-background" {...register("availability")} /></Field>
            <Field label="Bio" htmlFor="t-bio"><Textarea id="t-bio" rows={3} className="bg-background" {...register("bio")} /></Field>
            <Field label="Photo URL" htmlFor="t-avatar" error={errors.avatarUrl?.message}><Input type="url" placeholder="https://…" className="bg-background" {...errProps("t-avatar", errors.avatarUrl?.message)} {...register("avatarUrl")} /></Field>
            <FieldError>{formError}</FieldError>
            <div className="flex justify-end gap-2.5"><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Save trainer"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
