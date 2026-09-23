"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Heart, ListOrdered, LogOut, MapPin } from "lucide-react";
import { useAuth, useMe } from "@/components/providers/auth";
import { useGym } from "@/components/providers/gym";
import { Button } from "@/components/ui/button";
import { Avatar, Card, CardHead, PageHeader } from "@/components/ui/bits";
import { Field, FieldError, errProps } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { ToggleRow } from "@/components/ui/switch";
import { InstallButton } from "@/components/pwa/install-button";
import { useGamification } from "@/hooks/use-data";
import { updateProfile } from "@/lib/actions/profile";
import { UsernameTakenError } from "@/lib/actions/auth";
import { fmtMonthYear } from "@/lib/dates";
import { toast } from "@/lib/toast";
import { FITNESS_GOALS, TRAINING_TIMES, type TrainingTime } from "@/lib/types";
import { cn, errorMessage, fullName, initials } from "@/lib/utils";

const schema = z.object({
  firstName: z.string().trim().min(2, "First name needs 2+ characters.").max(40),
  lastName: z.string().trim().min(1, "Add your last name.").max(40),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_.]{3,20}$/, "3–20 characters: letters, numbers, _ or ."),
  fitnessGoals: z.array(z.string()).min(1, "Pick at least one goal."),
  usualTrainingTime: z.enum(TRAINING_TIMES as [string, ...string[]]),
  bio: z.string().trim().max(280, "Keep it under 280 characters."),
  leaderboardOptIn: z.boolean(),
  buddyOptIn: z.boolean(),
  autoPresenceEnabled: z.boolean(),
});
type Values = z.infer<typeof schema>;

export function ProfilePage() {
  const { me, gymId } = useMe();
  const { signOut } = useAuth();
  const { gym } = useGym();
  const router = useRouter();
  const gam = useGamification(gymId, me.uid);
  const [formError, setFormError] = useState("");
  const { register, control, handleSubmit, setValue, watch, setError, reset, formState: { errors, isSubmitting, isDirty } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: me.firstName, lastName: me.lastName, username: me.username, fitnessGoals: me.fitnessGoals ?? [], usualTrainingTime: me.usualTrainingTime ?? "Varies",
      bio: me.bio ?? "", leaderboardOptIn: me.leaderboardOptIn, buddyOptIn: me.buddyOptIn, autoPresenceEnabled: me.autoPresenceEnabled,
    },
  });
  const goals = watch("fitnessGoals");

  const onSubmit = async (v: Values) => {
    setFormError("");
    try {
      await updateProfile(me, { ...v, usualTrainingTime: v.usualTrainingTime as TrainingTime }, { timezone: gym.timezone, gamification: gam.data });
      reset(v);
      toast("Profile saved", "check", "success");
    } catch (e) {
      if (e instanceof UsernameTakenError) setError("username", { message: e.message });
      else setFormError(errorMessage(e));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Profile" title={fullName(me)} sub={`@${me.username} · member of ${gym.name}${me.createdAt ? ` since ${fmtMonthYear(me.createdAt.toDate())}` : ""}`}
        actions={<Avatar initials={initials(me.firstName, me.lastName)} size={56} photoURL={me.photoURL} />} />
      <form className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr))]" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Card className="gap-[18px]">
          <CardHead title="About you" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" htmlFor="p-first" error={errors.firstName?.message}><Input className="bg-background" {...errProps("p-first", errors.firstName?.message)} {...register("firstName")} /></Field>
            <Field label="Last name" htmlFor="p-last" error={errors.lastName?.message}><Input className="bg-background" {...errProps("p-last", errors.lastName?.message)} {...register("lastName")} /></Field>
          </div>
          <Field label="Username" htmlFor="p-user" error={errors.username?.message}><Input autoCapitalize="none" className="bg-background" {...errProps("p-user", errors.username?.message)} {...register("username")} /></Field>
          <fieldset className="flex flex-col gap-2.5">
            <legend className="mb-2.5 text-sm font-medium">Training for</legend>
            <div className="flex flex-wrap gap-2">
              {FITNESS_GOALS.map((g) => {
                const on = goals.includes(g);
                return <button key={g} type="button" aria-pressed={on} onClick={() => setValue("fitnessGoals", on ? goals.filter((x) => x !== g) : [...goals, g], { shouldDirty: true, shouldValidate: true })}
                  className={cn("h-9 rounded-full border px-3 text-sm font-medium transition-all", on ? "border-primary/50 bg-primary-soft text-accent-ink" : "border-border text-muted-foreground hover:text-foreground")}>{g}</button>;
              })}
            </div>
            <FieldError>{errors.fitnessGoals?.message}</FieldError>
          </fieldset>
          <Field label="Usually trains" htmlFor="p-time"><NativeSelect id="p-time" className="bg-background" {...register("usualTrainingTime")}>{TRAINING_TIMES.map((t) => <option key={t}>{t}</option>)}</NativeSelect></Field>
          <Field label="Bio" htmlFor="p-bio" error={errors.bio?.message}><Textarea rows={3} className="bg-background" {...errProps("p-bio", errors.bio?.message)} {...register("bio")} /></Field>
        </Card>
        <div className="flex flex-col gap-5">
          <Card className="gap-3">
            <CardHead title="Visibility & check-in" />
            <Controller control={control} name="leaderboardOptIn" render={({ field }) => <ToggleRow id="p-lb" icon={<ListOrdered size={22} />} title="Monthly leaderboard" description="Ranks visits and streaks — never weights" checked={field.value} onCheckedChange={field.onChange} />} />
            <Controller control={control} name="buddyOptIn" render={({ field }) => <ToggleRow id="p-buddy" icon={<Heart size={22} />} title="Gym Buddy matching" description="Opted-in members can see your streak, visits, PRs and badges" checked={field.value} onCheckedChange={field.onChange} />} />
            <Controller control={control} name="autoPresenceEnabled" render={({ field }) => <ToggleRow id="p-auto" icon={<MapPin size={22} />} title="Auto check-in" description={`Within ${gym.geofenceRadiusM} m of the gym, while the app is open`} checked={field.value} onCheckedChange={field.onChange} />} />
          </Card>
          <FieldError>{formError}</FieldError>
          <div className="flex flex-wrap gap-2.5">
            <Button type="submit" size="xl" disabled={isSubmitting || !isDirty}>{isSubmitting ? "Saving…" : "Save changes"}</Button>
            <Button variant="outline" size="xl" disabled={!isDirty} onClick={() => reset()}>Discard</Button>
          </div>
          <Card className="gap-3">
            <CardHead title="This device" />
            <InstallButton />
            <div className="flex flex-col gap-1 border-t border-border pt-3 text-sm text-muted-foreground">
              <span>Signed in as <span className="font-mono text-foreground">{me.email}</span></span>
              <span>Gym: <span className="font-medium text-foreground">{gym.name}</span> <span className="font-mono">({gym.id})</span></span>
            </div>
            <Button variant="outline" className="self-start" onClick={async () => { await signOut(); router.replace("/login"); }}><LogOut size={16} aria-hidden />Sign out</Button>
          </Card>
        </div>
      </form>
    </div>
  );
}
