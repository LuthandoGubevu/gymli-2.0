"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LocateFixed } from "lucide-react";
import { useMe } from "@/components/providers/auth";
import { useGym } from "@/components/providers/gym";
import { Button } from "@/components/ui/button";
import { Card, CardHead, PageHeader } from "@/components/ui/bits";
import { Field, FieldError, errProps } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Logo } from "@/components/icons";
import { updateGym } from "@/lib/actions/admin";
import { brandVars, hexToHsl, hslToHex } from "@/lib/branding";
import { toast } from "@/lib/toast";
import { errorMessage } from "@/lib/utils";

const num = (msg: string) => z.coerce.number<number>({ message: msg });
const schema = z.object({
  name: z.string().trim().min(2, "Name needs 2+ characters.").max(60),
  address: z.string().trim().max(200),
  contactEmail: z.union([z.literal(""), z.email("Enter a valid email.")]),
  contactPhone: z.string().trim().max(40),
  timezone: z.string().refine((tz) => { try { Intl.DateTimeFormat("en", { timeZone: tz }); return true; } catch { return false; } }, "Unknown timezone, e.g. Africa/Johannesburg"),
  latitude: z.union([z.literal(""), num("Latitude").min(-90).max(90)]),
  longitude: z.union([z.literal(""), num("Longitude").min(-180).max(180)]),
  geofenceRadiusM: num("Radius").int().min(25, "At least 25 m.").max(2000, "At most 2 000 m."),
  thresholdLow: num("Quiet").int().min(1),
  thresholdModerate: num("Moderate").int().min(2),
  thresholdPacked: num("Packed").int().min(3),
  openHour: num("Open").int().min(0).max(23),
  closeHour: num("Close").int().min(1).max(23),
  brandHex: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #F7C51B."),
  logoUrl: z.union([z.literal(""), z.url("Enter a full https:// URL.")]),
  promoTags: z.string().max(300),
  generalNotice: z.string().trim().max(200),
  offerExpiry: z.string(),
}).refine((v) => v.thresholdLow < v.thresholdModerate && v.thresholdModerate < v.thresholdPacked, { message: "Thresholds must go up: Quiet < Moderate < Packed.", path: ["thresholdPacked"] })
  .refine((v) => v.openHour < v.closeHour, { message: "Closing hour must be after opening.", path: ["closeHour"] });
type Values = z.input<typeof schema>;

export function SettingsAdmin() {
  const { gymId } = useMe();
  const { gym } = useGym();
  const [formError, setFormError] = useState("");
  const [locating, setLocating] = useState(false);
  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting, isDirty } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: gym.name, address: gym.address, contactEmail: gym.contactEmail, contactPhone: gym.contactPhone, timezone: gym.timezone,
      latitude: gym.latitude ?? "", longitude: gym.longitude ?? "", geofenceRadiusM: gym.geofenceRadiusM,
      thresholdLow: gym.thresholdLow, thresholdModerate: gym.thresholdModerate, thresholdPacked: gym.thresholdPacked,
      openHour: gym.openHour, closeHour: gym.closeHour, brandHex: hslToHex(gym.brandPrimary).toUpperCase(), logoUrl: gym.logoUrl,
      promoTags: gym.promoTags.join(", "), generalNotice: gym.generalNotice, offerExpiry: gym.offerExpiry ?? "",
    },
  });
  const brandHex = watch("brandHex");
  const e = errors;

  const onSubmit = async (raw: Values) => {
    setFormError("");
    const v = schema.parse(raw);
    try {
      await updateGym({ ...gym, id: gymId }, {
        name: v.name, address: v.address, contactEmail: v.contactEmail, contactPhone: v.contactPhone, timezone: v.timezone,
        latitude: v.latitude === "" ? null : v.latitude, longitude: v.longitude === "" ? null : v.longitude, geofenceRadiusM: v.geofenceRadiusM,
        thresholdLow: v.thresholdLow, thresholdModerate: v.thresholdModerate, thresholdPacked: v.thresholdPacked, openHour: v.openHour, closeHour: v.closeHour,
        brandPrimary: hexToHsl(v.brandHex)!, logoUrl: v.logoUrl, promoTags: v.promoTags.split(",").map((s) => s.trim()).filter(Boolean),
        generalNotice: v.generalNotice, offerExpiry: v.offerExpiry || null,
      });
      reset(raw);
      toast("Gym settings saved — members see changes immediately", "check", "success");
    } catch (err) { setFormError(errorMessage(err)); }
  };

  const useMyLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setValue("latitude", Number(p.coords.latitude.toFixed(6)), { shouldDirty: true }); setValue("longitude", Number(p.coords.longitude.toFixed(6)), { shouldDirty: true }); setLocating(false); },
      (err) => { setFormError(err.message); setLocating(false); }, { enableHighAccuracy: true, timeout: 15000 });
  };

  const f = (id: keyof Values, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, hint?: string) => (
    <Field label={label} htmlFor={`g-${id}`} error={e[id]?.message} hint={hint}>
      <Input className="bg-background" {...props} {...errProps(`g-${id}`, e[id]?.message)} {...register(id)} />
    </Field>
  );

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit(onSubmit)} noValidate>
      <PageHeader eyebrow="Admin · Gym settings" title={gym.name} actions={<Button type="submit" size="xl" disabled={isSubmitting || !isDirty}>{isSubmitting ? "Saving…" : "Save settings"}</Button>} />
      <FieldError>{formError}</FieldError>
      <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr))]">
        <Card className="gap-4">
          <CardHead title="Details" />
          {f("name", "Gym name")}
          {f("address", "Address")}
          <div className="grid grid-cols-2 gap-3">{f("contactEmail", "Contact email", { type: "email" })}{f("contactPhone", "Phone", { type: "tel" })}</div>
          <div className="grid grid-cols-3 gap-3">{f("timezone", "Timezone", {}, undefined)}{f("openHour", "Opens (hour)", { type: "number", className: "bg-background font-mono" })}{f("closeHour", "Closes (hour)", { type: "number", className: "bg-background font-mono" })}</div>
        </Card>
        <Card className="gap-4">
          <CardHead title="Branding" />
          <div className="flex items-center gap-4 rounded-lg border border-border bg-background p-4" aria-label="Brand preview">
            <span style={{ ["--primary" as string]: hexToHsl(brandHex) ?? undefined }} className="contents"><Logo name={watch("name") || gym.name} logoUrl={watch("logoUrl") || undefined} /></span>
            <span className="ml-auto rounded-md px-3 py-2 text-sm font-semibold" style={{ background: /^#[0-9a-f]{6}$/i.test(brandHex) ? brandHex : undefined, color: `hsl(${brandVars(hexToHsl(brandHex))["--primary-foreground"]})` }}>Check in</span>
          </div>
          <div className="grid grid-cols-[72px_minmax(0,1fr)] items-end gap-3">
            <Field label="Colour" htmlFor="g-brandPicker"><input id="g-brandPicker" type="color" value={/^#[0-9a-f]{6}$/i.test(brandHex) ? brandHex : "#F7C51B"} onChange={(ev) => setValue("brandHex", ev.target.value.toUpperCase(), { shouldDirty: true, shouldValidate: true })} className="h-[46px] w-full cursor-pointer rounded-md border border-border bg-background p-1" /></Field>
            {f("brandHex", "Hex", { className: "bg-background font-mono uppercase" })}
          </div>
          {f("logoUrl", "Logo URL", { type: "url", placeholder: "https://…/logo.png" }, "Square image. Used in the app, and as the home-screen icon on the next install.")}
        </Card>
        <Card className="gap-4">
          <CardHead title="Location & auto check-in" />
          <div className="grid grid-cols-2 gap-3">{f("latitude", "Latitude", { inputMode: "decimal", className: "bg-background font-mono" })}{f("longitude", "Longitude", { inputMode: "decimal", className: "bg-background font-mono" })}</div>
          <Button variant="outline" className="self-start" onClick={useMyLocation} disabled={locating}><LocateFixed size={16} aria-hidden />{locating ? "Locating…" : "Use my current location"}</Button>
          {f("geofenceRadiusM", "Geofence radius (m)", { type: "number", className: "bg-background font-mono" }, "Members within this distance are checked in automatically (if they opted in).")}
        </Card>
        <Card className="gap-4">
          <CardHead title="Crowd meter thresholds" />
          <p className="text-sm text-muted-foreground">Members in the gym at once. Above “Packed” shows as Packed; the meter&apos;s 100% is the Packed number.</p>
          <div className="grid grid-cols-3 gap-3">
            {f("thresholdLow", "Quiet up to", { type: "number", className: "bg-background font-mono" })}
            {f("thresholdModerate", "Moderate up to", { type: "number", className: "bg-background font-mono" })}
            {f("thresholdPacked", "Busy up to", { type: "number", className: "bg-background font-mono" })}
          </div>
        </Card>
        <Card className="gap-4">
          <CardHead title="Promotions" />
          <Field label="Banner message" htmlFor="g-generalNotice" error={e.generalNotice?.message} hint="Shown at the top of every member's dashboard. Leave empty to hide.">
            <Textarea rows={2} className="min-h-[64px] bg-background" {...errProps("g-generalNotice", e.generalNotice?.message)} {...register("generalNotice")} />
          </Field>
          {f("promoTags", "Promo tags", { placeholder: "Bring a friend free, Heritage Day hours" }, "Comma-separated chips next to the banner.")}
          {f("offerExpiry", "Offer ends", { type: "date", className: "bg-background font-mono" }, "Banner and tags hide automatically after this date.")}
        </Card>
      </div>
    </form>
  );
}
