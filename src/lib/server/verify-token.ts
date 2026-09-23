import "server-only";
import { createRemoteJWKSet, decodeJwt, jwtVerify } from "jose";
import { firebaseConfig, useEmulators } from "../env";

// Firebase ID tokens are RS256 JWTs signed by Google's securetoken service. Verifying
// them needs only the public JWKS — no service account / Admin SDK.
const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));

export async function verifyIdToken(token: string): Promise<{ uid: string; email?: string }> {
  const projectId = firebaseConfig.projectId;
  if (useEmulators) {
    // Auth-emulator tokens are unsigned. Only accept them when the app itself is in emulator mode.
    const claims = decodeJwt(token);
    if (claims.aud !== projectId || !claims.sub) throw new Error("Invalid emulator token");
    return { uid: claims.sub, email: claims.email as string | undefined };
  }
  const { payload } = await jwtVerify(token, JWKS, { issuer: `https://securetoken.google.com/${projectId}`, audience: projectId, algorithms: ["RS256"] });
  if (!payload.sub) throw new Error("Token has no subject");
  return { uid: payload.sub, email: payload.email as string | undefined };
}
