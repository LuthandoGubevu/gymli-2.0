"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, errProps } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { Toaster } from "@/components/providers/toaster";
import { signUpGymOwner } from "@/lib/actions/auth";
import { hexToHsl } from "@/lib/branding";
import { rootDomain } from "@/lib/env";
import { GYM_COOKIE, isValidSlug } from "@/lib/tenant";
import { DEFAULT_TZ } from "@/lib/dates";
import { errorMessage } from "@/lib/utils";

const schema = z.object({
  gymName: z.string().trim().min(2, "Your gym's name, 2+ characters.").max(60),
  slug: z.string().trim().toLowerCase().refine(isValidSlug, "3–32 lowercase letters, numbers or dashes."),
  brandHex: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a colour."),
  firstName: z.string().trim().min(2, "Your first name.").max(40),
  lastName: z.string().trim().min(1, "Your last name.").max(40),
  email: z.string().trim().regex(/^\S+@\S+\.\S+$/, "Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  terms: z.literal(true, { message: "Accept the terms to continue." }),
});
type Values = z.infer<typeof schema>;

const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32);

/** New-gym onboarding: creates the tenant + its owner (admin) in one atomic batch. */
export function StartWizard() {
  const [formError, setFormError] = useState("");
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting, dirtyFields } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { gymName: "", slug: "", brandHex: "#F7C51B", firstName: "", lastName: "", email: "", password: "", terms: false as unknown as true },
  });
  const slug = watch("slug");
  const terms = watch("terms");

  const onSubmit = async (v: Values) => {
    setFormError("");
    try {
      await signUpGymOwner({
        gymId: v.slug, gymName: v.gymName, brandPrimary: hexToHsl(v.brandHex) ?? undefined, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TZ,
        email: v.email, password: v.password, firstName: v.firstName, lastName: v.lastName, username: slugify(v.firstName).replace(/-/g, "") + "admin",
        fitnessGoals: ["Consistency"], bio: "", usualTrainingTime: "Varies", leaderboardOptIn: false, buddyOptIn: false, autoPresenceEnabled: false,
      });
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload: tenant changed, server must re-render branding
      if (rootDomain) window.location.href = `${window.location.protocol}//${v.slug}.${rootDomain}/app/admin/settings`;
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload: tenant changed
      else { document.cookie = `${GYM_COOKIE}=${v.slug}; path=/; max-age=31536000; samesite=lax`; window.location.href = "/app/admin/settings"; }
    } catch (e) {
      setFormError(errorMessage(e));
    }
  };

  return (
    <>
      <div className="flex flex-col gap-2.5">
        <span className="eyebrow text-accent-ink">For gym owners</span>
        <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-[-0.03em]">Put your gym on Gymli</h1>
        <p className="text-[15px] text-muted-foreground">Your own branded member app. You&apos;ll be the admin — add classes and invite members next.</p>
      </div>
      <form className="flex flex-col gap-[18px]" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Field label="Gym name" htmlFor="gymName" error={errors.gymName?.message}>
          <Input placeholder="e.g. Ironworks" {...errProps("gymName", errors.gymName?.message)} {...register("gymName", { onChange: (e) => { if (!dirtyFields.slug) setValue("slug", slugify(e.target.value)); } })} />
        </Field>
        <Field label="Member app address" htmlFor="slug" error={errors.slug?.message} hint={<span className="font-mono">{rootDomain ? `${slug || "your-gym"}.${rootDomain}` : `/g/${slug || "your-gym"}`}</span>}>
          <Input autoCapitalize="none" className="font-mono" {...errProps("slug", errors.slug?.message)} {...register("slug")} />
        </Field>
        <div className="grid grid-cols-[72px_minmax(0,1fr)] items-end gap-3">
          <Field label="Colour" htmlFor="brandPick"><input id="brandPick" type="color" value={watch("brandHex")} onChange={(e) => setValue("brandHex", e.target.value.toUpperCase())} className="h-[46px] w-full cursor-pointer rounded-md border border-border bg-card p-1" /></Field>
          <Field label="Brand colour" htmlFor="brandHex" error={errors.brandHex?.message}><Input className="font-mono uppercase" {...errProps("brandHex", errors.brandHex?.message)} {...register("brandHex")} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Your first name" htmlFor="firstName" error={errors.firstName?.message}><Input autoComplete="given-name" {...errProps("firstName", errors.firstName?.message)} {...register("firstName")} /></Field>
          <Field label="Last name" htmlFor="lastName" error={errors.lastName?.message}><Input autoComplete="family-name" {...errProps("lastName", errors.lastName?.message)} {...register("lastName")} /></Field>
        </div>
        <Field label="Work email" htmlFor="email" error={errors.email?.message}><Input type="email" autoComplete="email" {...errProps("email", errors.email?.message)} {...register("email")} /></Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message}><Input type="password" autoComplete="new-password" {...errProps("password", errors.password?.message)} {...register("password")} /></Field>
        <div className="flex flex-col gap-2">
          <label htmlFor="terms" className="flex cursor-pointer items-start gap-3 text-sm">
            <Checkbox id="terms" checked={terms === true} onCheckedChange={(c) => setValue("terms", (c === true) as true, { shouldValidate: true })} aria-invalid={errors.terms ? true : undefined} className="mt-0.5" />
            <span>I agree to the Gymli terms for gyms and confirm I&apos;m authorised to set this up for my gym.</span>
          </label>
          <FieldError>{errors.terms?.message}</FieldError>
        </div>
        <FieldError>{formError}</FieldError>
        <Button type="submit" size="xl" glow disabled={isSubmitting} className="text-base">{isSubmitting ? "Setting up…" : "Create my gym"} <ArrowRight size={18} aria-hidden /></Button>
      </form>
      <Toaster />
    </>
  );
}
