"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LogOut, MailCheck, Moon, RefreshCw, ShieldAlert, Sun } from "lucide-react";
import { useAuth } from "@/components/providers/auth";
import { Toaster } from "@/components/providers/toaster";
import { Logo } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/bits";
import { Field, FieldError, errProps } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signIn } from "@/lib/actions/auth";
import { createPlatformAccount, resendVerification } from "@/lib/actions/platform";
import { isSuperAdminEmail } from "@/lib/platform";
import { useTheme } from "@/lib/theme";
import { toast, toastError } from "@/lib/toast";
import { errorMessage } from "@/lib/utils";

/** UI gate for /super. The real boundary is isSuper() in firestore.rules. */
export function SuperGate({ children }: { children: React.ReactNode }) {
  const { status, user, isSuper } = useAuth();
  if (status === "loading") return <Centered><Spinner label="Loading" /></Centered>;
  if (!user) return <Centered><SuperSignIn /></Centered>;
  if (!isSuperAdminEmail(user.email)) return <Centered><NotAllowed /></Centered>;
  if (!isSuper) return <Centered><VerifyEmail /></Centered>;
  return <SuperShell>{children}</SuperShell>;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="flex w-full max-w-[420px] animate-gy-up flex-col gap-6">
        <Logo />
        {children}
      </div>
      <Toaster />
    </div>
  );
}

const schema = z.object({
  email: z.string().trim().regex(/^\S+@\S+\.\S+$/, "Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

function SuperSignIn() {
  const [mode, setMode] = useState<"signin" | "create">("signin");
  const [formError, setFormError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const onSubmit = async (v: z.infer<typeof schema>) => {
    setFormError("");
    try {
      if (mode === "create") {
        if (!isSuperAdminEmail(v.email)) { setFormError("Platform accounts are only for the Gymli team. Members sign up from their gym's page."); return; }
        await createPlatformAccount(v.email, v.password);
        toast("Account created — check your inbox for the verification link", "check", "success");
      } else {
        await signIn(v.email, v.password);
      }
    } catch (e) { setFormError(errorMessage(e)); }
  };
  return (
    <>
      <div className="flex flex-col gap-2">
        <span className="eyebrow text-accent-ink">Gymli platform</span>
        <h1 className="font-display text-3xl font-bold leading-tight tracking-[-0.03em]">{mode === "signin" ? "Sign in to manage gyms" : "Create your platform account"}</h1>
      </div>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Field label="Email" htmlFor="sa-email" error={errors.email?.message}><Input type="email" autoComplete="email" {...errProps("sa-email", errors.email?.message)} {...register("email")} /></Field>
        <Field label="Password" htmlFor="sa-password" error={errors.password?.message}><Input type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} {...errProps("sa-password", errors.password?.message)} {...register("password")} /></Field>
        <FieldError>{formError}</FieldError>
        <Button type="submit" size="xl" glow disabled={isSubmitting}>{isSubmitting ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}</Button>
      </form>
      <button type="button" className="self-start text-sm font-medium text-accent-ink hover:underline" onClick={() => { setMode(mode === "signin" ? "create" : "signin"); setFormError(""); }}>
        {mode === "signin" ? "First time? Create the platform account" : "Already have an account? Sign in"}
      </button>
    </>
  );
}

function NotAllowed() {
  const { signOut, user } = useAuth();
  return (
    <>
      <div className="flex items-start gap-3 rounded-lg border soft-destructive p-4"><ShieldAlert size={20} className="mt-0.5 flex-none" aria-hidden /><span className="text-sm">This area is for the Gymli team. <span className="font-mono">{user?.email}</span> isn&apos;t a platform account.</span></div>
      <div className="flex gap-2"><Button asChild variant="outline"><Link href="/app">Go to the app</Link></Button><Button variant="ghost" onClick={() => signOut()}><LogOut size={16} aria-hidden />Sign out</Button></div>
    </>
  );
}

function VerifyEmail() {
  const { user, refreshUser, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  return (
    <>
      <div className="flex flex-col gap-2">
        <span className="eyebrow text-accent-ink">One more step</span>
        <h1 className="font-display text-3xl font-bold leading-tight tracking-[-0.03em]">Verify your email</h1>
        <p className="text-[15px] leading-normal text-muted-foreground">Platform access switches on once <span className="font-mono text-foreground">{user?.email}</span> is verified. Click the link we emailed you, then come back here.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} onClick={async () => {
          setBusy(true);
          try { await refreshUser(); } catch (e) { toastError(errorMessage(e)); } finally { setBusy(false); }
        }}><RefreshCw size={16} aria-hidden className={busy ? "animate-spin" : undefined} />I&apos;ve verified — continue</Button>
        <Button variant="outline" onClick={() => user && resendVerification(user).then(() => toast("Verification email sent", "check", "success")).catch((e) => toastError(errorMessage(e)))}><MailCheck size={16} aria-hidden />Resend link</Button>
      </div>
      <Button variant="ghost" className="self-start" onClick={() => signOut()}><LogOut size={16} aria-hidden />Sign out</Button>
    </>
  );
}

function SuperShell({ children }: { children: React.ReactNode }) {
  const { profile, user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const router = useRouter();
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 flex h-[60px] items-center justify-between gap-3 border-b border-border bg-glass px-4 backdrop-blur-[14px] nav:px-10">
        <Link href="/super" className="flex items-center gap-3 text-foreground no-underline hover:no-underline">
          <Logo />
          <span className="rounded-full border border-primary/40 bg-primary-soft px-2.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-[.08em] text-accent-ink">Platform</span>
        </Link>
        <div className="flex items-center gap-1.5">
          <span className="hidden font-mono text-xs text-muted-foreground sm:inline">{user?.email}</span>
          {profile ? <Button asChild variant="outline" size="md"><Link href="/app/admin">Back to {profile.gymId}</Link></Button> : null}
          <button type="button" onClick={toggle} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} className="grid h-10 w-10 place-items-center rounded-md border border-border text-muted-foreground hover:text-foreground">{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button>
          <button type="button" onClick={async () => { await signOut(); router.replace("/super"); }} aria-label="Sign out" className="grid h-10 w-10 place-items-center rounded-md border border-border text-muted-foreground hover:text-foreground"><LogOut size={18} /></button>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-[1180px] animate-gy-up px-4 pb-14 pt-6 nav:px-10 nav:pt-9">{children}</main>
      <Toaster />
    </div>
  );
}
