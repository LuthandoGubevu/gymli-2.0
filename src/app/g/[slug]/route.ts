// Single-domain tenant entry: gymli.app/g/ironworks sets the gym cookie and sends the
// visitor to that gym's sign-in page. On subdomain deploys this isn't needed.
import { NextResponse } from "next/server";
import { GYM_COOKIE, isValidSlug } from "@/lib/tenant";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = slug.toLowerCase();
  const url = new URL(isValidSlug(s) ? "/login" : "/", req.url);
  const res = NextResponse.redirect(url);
  if (isValidSlug(s)) res.cookies.set(GYM_COOKIE, s, { path: "/", maxAge: 31536000, sameSite: "lax" });
  return res;
}
