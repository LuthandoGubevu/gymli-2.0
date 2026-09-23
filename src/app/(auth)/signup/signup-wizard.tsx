"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Heart, ListOrdered, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field, FieldError, errProps } from "@/components/ui/field";
import { ToggleRow } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RedirectIfAuthed } from "@/components/shell/redirect-if-authed";
import { useGym } from "@/components/providers/gym";
import { useAuth } from "@/components/providers/auth";
import { isUsernameFree, signUpMember, UsernameTakenError } from "@/lib/actions/auth";
import { FITNESS_GOALS, TRAINING_TIMES } from "@/lib/types";
import { toast } from "@/lib/toast";
import { cn, errorMessage } from "@/lib/utils";

export const signupSchema = z.object({
  email: z.string().trim().regex(/^\S+@\S+\.\S+$/, "Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  firstName: z.string().trim().min(2, "Tell us your first name so your coach knows who you are.").max(40),
  lastName: z.string().trim().min(1, "Add your last name.").max(40),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_.]{3,20}$/, "3–20 characters: letters, numbers, _ or ."),
  fitnessGoals: z.array(z.string()).min(1, "Pick at least one goal."),
  usualTrainingTime: z.enum(TRAINING_TIMES as [string, ...string[]]),
  bio: z.string().trim().max(280, "Keep it under 280 characters."),
  autoPresenceEnabled: z.boolean(),
  buddyOptIn: z.boolean(),
  leaderboardOptIn: z.boolean(),
  terms: z.literal(true, { message: "You need to accept the terms to join." }),
});
export type SignupValues = z.infer<typeof signupSchema>;

const STEP_FIELDS: (keyof SignupValues)[][] = [
  ["email", "password"],
  ["firstName", "lastName", "username", "fitnessGoals", "usualTrainingTime", "bio"],
  ["autoPresenceEnabled"],
  ["buddyOptIn", "leaderboardOptIn", "terms"],
];

export function SignupWizard() {
  const { gym, exists } = useGym();
  const { user, status } = useAuth();
  const router = useRouter();
  const resume = useSearchParams().get("resume") === "1" && status === "noProfile" && !!user;
  const firstStep = resume ? 1 : 0;
  const [step, setStep] = useState(0);
  const cur = Math.max(step, firstStep);
  const [formError, setFormError] = useState("");
  const [checkingName, setCheckingName] = useState(false);

  const { register, control, handleSubmit, trigger, setError, watch, setValue, formState: { errors, isSubmitting } } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "", password: "", firstName: "", lastName: "", username: "", fitnessGoals: [], usualTrainingTime: "Evenings", bio: "",
      autoPresenceEnabled: true, buddyOptIn: false, leaderboardOptIn: false, terms: false as unknown as true,
    },
    mode: "onTouched",
  });

  useEffect(() => {
    if (resume && user?.email) { setValue("email", user.email); setValue("password", "resume-placeholder"); }
  }, [resume, user, setValue]);

  if (!exists) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-3xl font-bold">This gym isn&apos;t on Gymli yet</h1>
        <p className="text-muted-foreground">Ask your gym for their signup link, or set up your own gym.</p>
        <Button asChild size="xl"><Link href="/start" className="text-primary-foreground no-underline hover:no-underline">Set up a gym</Link></Button>
      </div>
    );
  }

  const next = async () => {
    setFormError("");
    if (resume && cur === 0) { setStep(1); return; }
    const ok = await trigger(STEP_FIELDS[cur]);
    if (!ok) return;
    if (cur === 1) {
      setCheckingName(true);
      try {
        if (!(await isUsernameFree(gym.id, watch("username")))) { setError("username", { message: "That username is taken — try another." }); return; }
      } catch { /* offline — the final write will catch it */ } finally { setCheckingName(false); }
    }
    if (cur < 3) setStep(cur + 1);
    else await handleSubmit(onSubmit)();
  };

  const back = () => (cur > firstStep ? setStep(cur - 1) : router.push("/login"));

  const onSubmit = async (v: SignupValues) => {
    setFormError("");
    try {
      await signUpMember({ ...v, gymId: gym.id, email: resume ? user!.email ?? v.email : v.email } as Parameters<typeof signUpMember>[0], resume ? user : null);
      toast(`Welcome to ${gym.name}, ${v.firstName.trim()}`, "sparkles", "accent");
      router.replace("/app");
    } catch (e) {
      if (e instanceof UsernameTakenError) { setError("username", { message: e.message }); setStep(1); return; }
      const msg = errorMessage(e);
      if ((e as { code?: string }).code === "auth/email-already-in-use") { setError("email", { message: msg }); setStep(0); return; }
      setFormError(msg);
    }
  };

  const goals = watch("fitnessGoals");
  const toggleGoal = (g: string) => setValue("fitnessGoals", goals.includes(g) ? goals.filter((x) => x !== g) : [...goals, g], { shouldValidate: true });

  return (
    <>
      {!resume ? <RedirectIfAuthed /> : null}
      <div className="flex flex-col gap-[18px]">
        <div className="grid grid-cols-4 gap-1.5" aria-hidden>
          {[0, 1, 2, 3].map((i) => <div key={i} className={cn("h-1 rounded-full transition-colors [transition-duration:250ms]", i <= cur ? "bg-primary" : "bg-muted")} />)}
        </div>
        <span className="eyebrow">Step {cur + 1} of 4</span>
      </div>

      <form className="flex flex-col gap-[22px]" onSubmit={(e) => { e.preventDefault(); void next(); }} noValidate>
        {cur === 0 ? (
          <div key="s0" className="flex animate-gy-up flex-col gap-[22px]">
            <h1 className="font-display text-[34px] font-bold leading-[1.05] tracking-[-0.03em]">Join {gym.name}</h1>
            <Field label="Email" htmlFor="email" error={errors.email?.message}>
              <Input type="email" autoComplete="email" placeholder="you@example.com" {...errProps("email", errors.email?.message)} {...register("email")} />
            </Field>
            <Field label="Password" htmlFor="password" error={errors.password?.message}>
              <Input type="password" autoComplete="new-password" placeholder="At least 6 characters" {...errProps("password", errors.password?.message)} {...register("password")} />
            </Field>
          </div>
        ) : null}

        {cur === 1 ? (
          <div key="s1" className="flex animate-gy-up flex-col gap-[22px]">
            <h1 className="font-display text-[34px] font-bold leading-[1.05] tracking-[-0.03em]">What should we call you?</h1>
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name" htmlFor="firstName" error={errors.firstName?.message}>
                <Input autoComplete="given-name" placeholder="e.g. Thandi" {...errProps("firstName", errors.firstName?.message)} {...register("firstName")} />
              </Field>
              <Field label="Last name" htmlFor="lastName" error={errors.lastName?.message}>
                <Input autoComplete="family-name" placeholder="e.g. Mokoena" {...errProps("lastName", errors.lastName?.message)} {...register("lastName")} />
              </Field>
            </div>
            <Field label="Username" htmlFor="username" error={errors.username?.message} hint="Shown on the leaderboard and to Gym Buddy matches.">
              <Input autoComplete="username" autoCapitalize="none" placeholder="thandi.lifts" {...errProps("username", errors.username?.message)} {...register("username")} />
            </Field>
            <fieldset className="flex flex-col gap-2.5">
              <legend className="mb-2.5 text-sm font-medium">What are you training for?</legend>
              <div className="flex flex-wrap gap-2">
                {FITNESS_GOALS.map((g) => {
                  const on = goals.includes(g);
                  return (
                    <button key={g} type="button" aria-pressed={on} onClick={() => toggleGoal(g)}
                      className={cn("h-10 rounded-full border px-3.5 text-sm font-medium transition-all duration-150", on ? "border-primary/50 bg-primary-soft text-accent-ink" : "border-border text-muted-foreground hover:text-foreground")}>
                      {g}
                    </button>
                  );
                })}
              </div>
              <FieldError>{errors.fitnessGoals?.message}</FieldError>
            </fieldset>
            <Field label="When do you usually train?" htmlFor="usualTrainingTime">
              <NativeSelect id="usualTrainingTime" {...register("usualTrainingTime")}>
                {TRAINING_TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
              </NativeSelect>
            </Field>
            <Field label="A line about you" htmlFor="bio" error={errors.bio?.message} hint="Optional — helps a Gym Buddy know what you're after.">
              <Textarea rows={3} placeholder="Looking for a spotter on heavy bench days." {...errProps("bio", errors.bio?.message)} {...register("bio")} />
            </Field>
          </div>
        ) : null}

        {cur === 2 ? (
          <div key="s2" className="flex animate-gy-up flex-col gap-[22px]">
            <h1 className="font-display text-[34px] font-bold leading-[1.05] tracking-[-0.03em]">Check in without thinking.</h1>
            <p className="text-[15px] leading-[1.55] text-muted-foreground">Auto check-in uses your location when you&apos;re within {gym.geofenceRadiusM} m of the gym, so your streak counts even when you forget. Your location never leaves your phone.</p>
            <Controller control={control} name="autoPresenceEnabled" render={({ field }) => (
              <ToggleRow id="autoPresenceEnabled" icon={<MapPin size={22} />} title="Auto check-in" description="You can change this any time" checked={field.value} onCheckedChange={field.onChange} />
            )} />
          </div>
        ) : null}

        {cur === 3 ? (
          <div key="s3" className="flex animate-gy-up flex-col gap-[22px]">
            <h1 className="font-display text-[34px] font-bold leading-[1.05] tracking-[-0.03em]">Train with people, not just near them.</h1>
            <Controller control={control} name="buddyOptIn" render={({ field }) => (
              <ToggleRow id="buddyOptIn" icon={<Heart size={22} />} title="Gym Buddy matching" description="Only members who opt in can see you" checked={field.value} onCheckedChange={field.onChange} />
            )} />
            <Controller control={control} name="leaderboardOptIn" render={({ field }) => (
              <ToggleRow id="leaderboardOptIn" icon={<ListOrdered size={22} />} title="Monthly leaderboard" description="Ranks visits and streaks — never weights" checked={field.value} onCheckedChange={field.onChange} />
            )} />
            <Controller control={control} name="terms" render={({ field }) => (
              <div className="flex flex-col gap-2">
                <label htmlFor="terms" className="flex cursor-pointer items-start gap-3 text-sm leading-normal">
                  <Checkbox id="terms" checked={field.value === true} onCheckedChange={(v) => field.onChange(v === true)} aria-invalid={errors.terms ? true : undefined} aria-describedby={errors.terms ? "terms-error" : undefined} className="mt-0.5" />
                  <span>I agree to {gym.name}&apos;s member terms and to Gymli storing my check-ins, bookings and records to run this app.</span>
                </label>
                <FieldError id="terms-error">{errors.terms?.message}</FieldError>
              </div>
            )} />
          </div>
        ) : null}

        <FieldError>{formError}</FieldError>
        <div className="flex gap-2.5">
          <Button variant="outline" size="xl" onClick={back} className="px-[18px] text-[15px] font-medium">Back</Button>
          <Button type="submit" size="xl" glow disabled={isSubmitting || checkingName} className="flex-1 text-base">
            {isSubmitting ? "Creating your account…" : cur === 3 ? "Finish" : "Continue"} <ArrowRight size={18} aria-hidden />
          </Button>
        </div>
      </form>
      {cur === 0 ? (
        <p className="text-center text-sm text-muted-foreground">Already a member? <Link href="/login" className="font-semibold">Sign in</Link></p>
      ) : null}
    </>
  );
}
