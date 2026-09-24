"use client";
import { useEffect, useMemo, useState } from "react";
import { collection, query } from "firebase/firestore";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, Copy, LogIn, Pause, Play, Plus, Search } from "lucide-react";
import { useAuth } from "@/components/providers/auth";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Pill, Skeleton } from "@/components/ui/bits";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, FieldError, errProps } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/icons";
import { useQuery } from "@/hooks/use-firestore";
import { createGym, enterGymAsAdmin, memberCount, setGymStatus } from "@/lib/actions/platform";
import { hexToHsl } from "@/lib/branding";
import { DEFAULT_TZ, fmtMonthYear } from "@/lib/dates";
import { rootDomain } from "@/lib/env";
import { normalizeGym } from "@/lib/gym-defaults";
import { isValidSlug } from "@/lib/tenant";
import { toast, toastError } from "@/lib/toast";
import { cn, errorMessage } from "@/lib/utils";

const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32);

export function SuperConsole() {
  const { user, profile } = useAuth();
  const gyms = useQuery<Record<string, unknown>>("platform:gyms", (db) => query(collection(db, "gyms")));
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  const list = useMemo(() => gyms.data.map((g) => normalizeGym(g.id, g))
    .filter((g) => !q || `${g.name} ${g.id}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name)), [gyms.data, q]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- window is client-only; read after mount
  useEffect(() => setOrigin(window.location.origin), []);
  const ids = gyms.data.map((g) => g.id).join(",");
  useEffect(() => {
    if (!ids) return;
    let cancelled = false;
    Promise.all(ids.split(",").map(async (id) => [id, await memberCount(id).catch(() => -1)] as const))
      .then((rows) => { if (!cancelled) setCounts(Object.fromEntries(rows)); });
    return () => { cancelled = true; };
  }, [ids]);

  const signupLink = (id: string) => (rootDomain ? `https://${id}.${rootDomain}/signup` : `${origin}/g/${id}`);
  const active = list.filter((g) => g.status === "active").length;
  const totalMembers = Object.values(counts).filter((n) => n > 0).reduce((a, b) => a + b, 0);

  const toggleStatus = async (id: string, name: string, status: "active" | "suspended") => {
    const next = status === "active" ? "suspended" : "active";
    if (next === "suspended" && !window.confirm(`Suspend ${name}? Its members and admins lose access until you reactivate it. No data is deleted.`)) return;
    setBusy(id);
    try { await setGymStatus(id, next); toast(next === "suspended" ? `${name} suspended` : `${name} reactivated`, next === "suspended" ? "x" : "check", next === "suspended" ? "muted" : "success"); }
    catch (e) { toastError(errorMessage(e)); } finally { setBusy(null); }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={`Platform · ${list.length} gyms · ${active} active · ${totalMembers} members`} title="All gyms"
        sub={profile ? <>You&apos;re currently managing <span className="font-mono text-foreground">{profile.gymId}</span>.</> : "Open a gym to manage it as its admin."}
        actions={<Button size="xl" glow onClick={() => setCreating(true)}><Plus size={18} aria-hidden />New gym</Button>} />
      <label className="relative max-w-sm">
        <span className="sr-only">Search gyms</span>
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or address" className="pl-10" />
      </label>
      {gyms.loading ? <Skeleton className="h-64 rounded-xl" /> : list.length ? (
        <ul className="flex flex-col gap-3">
          {list.map((g) => {
            const current = profile?.gymId === g.id;
            return (
              <li key={g.id} className={cn("surface flex flex-wrap items-center gap-x-6 gap-y-3 px-6 py-5", g.status === "suspended" && "opacity-70")}>
                <span style={{ ["--primary" as string]: g.brandPrimary }} className="contents"><Logo name={g.name} logoUrl={g.logoUrl} showName={false} size={40} /></span>
                <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-lg font-semibold">{g.name}</span>
                    <Pill className={g.status === "active" ? "soft-success px-2 py-0.5 text-xs" : "soft-warning px-2 py-0.5 text-xs"}>{g.status === "active" ? "Active" : "Suspended"}</Pill>
                    {current ? <Pill className="border-primary/40 bg-primary-soft px-2 py-0.5 text-xs text-accent-ink">Managing</Pill> : null}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">{g.id} · {counts[g.id] === undefined ? "…" : counts[g.id] < 0 ? "?" : counts[g.id]} members{typeof g.createdAt?.toDate === "function" ? ` · since ${fmtMonthYear(g.createdAt.toDate())}` : ""}{g.contactEmail ? ` · ${g.contactEmail}` : ""}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="md" aria-label={`Copy member signup link for ${g.name}`} onClick={() => navigator.clipboard.writeText(signupLink(g.id)).then(() => toast("Signup link copied", "check", "success"), () => toastError(signupLink(g.id)))}><Copy size={15} aria-hidden />Signup link</Button>
                  <Button variant="outline" size="md" disabled={busy === g.id} onClick={() => toggleStatus(g.id, g.name, g.status)}>
                    {g.status === "active" ? <><Pause size={15} aria-hidden />Suspend</> : <><Play size={15} aria-hidden />Reactivate</>}
                  </Button>
                  <Button size="md" disabled={busy === g.id || !user} onClick={async () => {
                    setBusy(g.id);
                    try { await enterGymAsAdmin(user!, profile, g.id); } catch (e) { toastError(errorMessage(e)); setBusy(null); }
                  }}><LogIn size={15} aria-hidden />Open as admin</Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : <EmptyState icon={<Building2 size={26} />} title={q ? "No gyms match" : "No gyms yet"} sub={q ? "Try another name." : "Create the first gym, then share its signup link with members."} action={!q ? <Button size="lg" onClick={() => setCreating(true)}>Create a gym</Button> : undefined} />}
      <p className="text-[13px] text-muted-foreground">To give a gym its own admin: open it, then promote a member under Manage → Members. Suspending hides a gym from its members without deleting anything.</p>
      <CreateGymDialog open={creating} onOpenChange={setCreating} existing={new Set(gyms.data.map((g) => g.id))} />
    </div>
  );
}

const schema = z.object({
  name: z.string().trim().min(2, "Gym name needs 2+ characters.").max(60),
  id: z.string().trim().toLowerCase().refine(isValidSlug, "3–32 lowercase letters, numbers or dashes."),
  brandHex: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #F7C51B."),
  timezone: z.string().refine((tz) => { try { Intl.DateTimeFormat("en", { timeZone: tz }); return true; } catch { return false; } }, "Unknown timezone, e.g. Africa/Johannesburg"),
  contactEmail: z.union([z.literal(""), z.email("Enter a valid email.")]),
});
type Values = z.infer<typeof schema>;

function CreateGymDialog({ open, onOpenChange, existing }: { open: boolean; onOpenChange: (o: boolean) => void; existing: Set<string> }) {
  const [formError, setFormError] = useState("");
  const { register, handleSubmit, setValue, watch, reset, setError, formState: { errors, isSubmitting, dirtyFields } } = useForm<Values>({
    resolver: zodResolver(schema), defaultValues: { name: "", id: "", brandHex: "#F7C51B", timezone: DEFAULT_TZ, contactEmail: "" },
  });
  const id = watch("id");
  const onSubmit = async (v: Values) => {
    setFormError("");
    if (existing.has(v.id)) { setError("id", { message: "That address is taken." }); return; }
    try {
      await createGym({ id: v.id, name: v.name, brandPrimary: hexToHsl(v.brandHex) ?? undefined, timezone: v.timezone, contactEmail: v.contactEmail });
      toast(`${v.name} created`, "check", "success");
      reset();
      onOpenChange(false);
    } catch (e) { setFormError(errorMessage(e)); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="New gym" description="Creates the tenant. Add classes and an admin once it exists.">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Field label="Gym name" htmlFor="ng-name" error={errors.name?.message}>
            <Input className="bg-background" placeholder="e.g. Northside Boxing Club" {...errProps("ng-name", errors.name?.message)} {...register("name", { onChange: (e) => { if (!dirtyFields.id) setValue("id", slugify(e.target.value)); } })} />
          </Field>
          <Field label="Address" htmlFor="ng-id" error={errors.id?.message} hint={<span className="font-mono">{rootDomain ? `${id || "your-gym"}.${rootDomain}` : `/g/${id || "your-gym"}`}</span>}>
            <Input autoCapitalize="none" className="bg-background font-mono" {...errProps("ng-id", errors.id?.message)} {...register("id")} />
          </Field>
          <div className="grid grid-cols-[72px_minmax(0,1fr)] items-end gap-3">
            <Field label="Colour" htmlFor="ng-pick"><input id="ng-pick" type="color" value={/^#[0-9a-f]{6}$/i.test(watch("brandHex")) ? watch("brandHex") : "#F7C51B"} onChange={(e) => setValue("brandHex", e.target.value.toUpperCase(), { shouldValidate: true })} className="h-[46px] w-full cursor-pointer rounded-md border border-border bg-background p-1" /></Field>
            <Field label="Brand colour" htmlFor="ng-hex" error={errors.brandHex?.message}><Input className="bg-background font-mono uppercase" {...errProps("ng-hex", errors.brandHex?.message)} {...register("brandHex")} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Timezone" htmlFor="ng-tz" error={errors.timezone?.message}><Input className="bg-background" {...errProps("ng-tz", errors.timezone?.message)} {...register("timezone")} /></Field>
            <Field label="Contact email" htmlFor="ng-email" error={errors.contactEmail?.message}><Input type="email" className="bg-background" {...errProps("ng-email", errors.contactEmail?.message)} {...register("contactEmail")} /></Field>
          </div>
          <FieldError>{formError}</FieldError>
          <div className="flex justify-end gap-2.5"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating…" : "Create gym"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
