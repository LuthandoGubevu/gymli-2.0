"use client";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, errProps } from "@/components/ui/field";
import { RedirectIfAuthed } from "@/components/shell/redirect-if-authed";
import { useGym } from "@/components/providers/gym";
import { signIn } from "@/lib/actions/auth";
import { demoMode } from "@/lib/env";
import { errorMessage } from "@/lib/utils";

const schema = z.object({
  email: z.string().trim().regex(/^\S+@\S+\.\S+$/, "Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});
type Values = z.infer<typeof schema>;

export function LoginForm() {
  const { gym, exists } = useGym();
  const [formError, setFormError] = useState("");
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  const onSubmit = async (v: Values) => {
    setFormError("");
    try {
      await signIn(v.email, v.password);
      // RedirectIfAuthed moves us on once the profile has loaded.
    } catch (e) {
      setFormError(errorMessage(e));
    }
  };

  const demo = (who: "member" | "admin") => {
    setValue("email", who === "member" ? "thandi@demo.gymli.app" : "admin@demo.gymli.app");
    setValue("password", "password123");
    void handleSubmit(onSubmit)();
  };

  return (
    <>
      <RedirectIfAuthed />
      <div className="flex flex-col gap-2.5">
        <span className="eyebrow text-accent-ink">Welcome back</span>
        <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-[-0.03em]">Sign in to {exists ? gym.name : "Gymli"}</h1>
        <p className="text-[15px] text-muted-foreground">Your streak is waiting.</p>
      </div>
      <form className="flex flex-col gap-[18px]" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input type="email" autoComplete="email" placeholder="you@example.com" {...errProps("email", errors.email?.message)} {...register("email")} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message}>
          <Input type="password" autoComplete="current-password" placeholder="At least 6 characters" {...errProps("password", errors.password?.message)} {...register("password")} />
        </Field>
        <FieldError>{formError}</FieldError>
        <Button type="submit" size="xl" glow disabled={isSubmitting} className="h-12 text-base">{isSubmitting ? "Signing in…" : "Sign in"}</Button>
        {demoMode ? (
          <div className="grid grid-cols-2 gap-2.5">
            <Button variant="outline" size="lg" onClick={() => demo("member")}>Demo member</Button>
            <Button variant="outline" size="lg" onClick={() => demo("admin")}>Demo admin</Button>
          </div>
        ) : null}
      </form>
      <p className="text-center text-sm text-muted-foreground">
        New to the gym? <Link href="/signup" className="font-semibold">Create an account</Link>
      </p>
    </>
  );
}
