"use client";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> }

/** Shows "Install app" when the browser offers it; an Add-to-Home-Screen hint on iOS. */
export function InstallButton() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [state, setState] = useState<"unknown" | "installed" | "ios" | "other">("unknown");
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser-only state after mount
    setState(standalone ? "installed" : ios ? "ios" : "other");
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as BeforeInstallPromptEvent); };
    const onInstalled = () => { setEvt(null); setState("installed"); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);
  if (state === "installed") return <p className="text-sm text-muted-foreground">Installed on this device.</p>;
  if (evt) return <Button variant="outline" onClick={async () => { await evt.prompt(); await evt.userChoice; setEvt(null); }}><Download size={16} aria-hidden />Install app</Button>;
  if (state === "ios") return <p className="text-sm text-muted-foreground">On iPhone: tap Share, then <span className="font-semibold text-foreground">Add to Home Screen</span>.</p>;
  return <p className="text-sm text-muted-foreground">Use your browser&apos;s menu to install this app on your device.</p>;
}
