// Minimal Firestore REST client for server code (route handlers, layouts, manifest).
// We deliberately do NOT use firebase-admin: the deploy target (Netlify/Vercel) has no
// Application Default Credentials. Requests are either unauthenticated (public docs like
// gyms/{gymId}) or carry the caller's own Firebase ID token, so security rules still apply.
import "server-only";
import { EMULATOR_HOST, FIRESTORE_EMULATOR_PORT, firebaseConfig, useEmulators } from "../env";

type FsValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { timestampValue: string }
  | { arrayValue: { values?: FsValue[] } }
  | { mapValue: { fields?: Record<string, FsValue> } };

function base() {
  const origin = useEmulators ? `http://${EMULATOR_HOST}:${FIRESTORE_EMULATOR_PORT}` : "https://firestore.googleapis.com";
  return `${origin}/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;
}

export function decodeValue(v: FsValue): unknown {
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("timestampValue" in v) return v.timestampValue;
  if ("arrayValue" in v) return (v.arrayValue.values ?? []).map(decodeValue);
  if ("mapValue" in v) return decodeFields(v.mapValue.fields ?? {});
  return null;
}

export function decodeFields(fields: Record<string, FsValue>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, decodeValue(v)]));
}

export function encodeValue(v: unknown): FsValue {
  if (v === null || v === undefined) return { nullValue: null };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encodeValue) } };
  if (typeof v === "object") return { mapValue: { fields: encodeFields(v as Record<string, unknown>) } };
  throw new Error(`Cannot encode ${typeof v}`);
}

export function encodeFields(o: Record<string, unknown>): Record<string, FsValue> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined).map(([k, v]) => [k, encodeValue(v)]));
}

function headers(idToken?: string) {
  const h: Record<string, string> = { "content-type": "application/json" };
  if (idToken) h.authorization = `Bearer ${idToken}`;
  return h;
}

export async function getDocument(path: string, opts: { idToken?: string; revalidate?: number } = {}) {
  const url = `${base()}/${path}?key=${firebaseConfig.apiKey}`;
  const res = await fetch(url, { headers: headers(opts.idToken), next: opts.revalidate !== undefined ? { revalidate: opts.revalidate } : undefined, cache: opts.revalidate === undefined ? "no-store" : undefined });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore GET ${path} failed: ${res.status}`);
  const json = (await res.json()) as { fields?: Record<string, FsValue> };
  return decodeFields(json.fields ?? {});
}

/** Lists a collection (first page). Used for small per-user collections only. */
export async function listDocuments(path: string, idToken: string, pageSize = 50) {
  const res = await fetch(`${base()}/${path}?pageSize=${pageSize}&key=${firebaseConfig.apiKey}`, { headers: headers(idToken), cache: "no-store" });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`Firestore LIST ${path} failed: ${res.status}`);
  const json = (await res.json()) as { documents?: { name: string; fields?: Record<string, FsValue> }[] };
  return (json.documents ?? []).map((d) => ({ id: d.name.split("/").pop()!, ...decodeFields(d.fields ?? {}) }) as Record<string, unknown> & { id: string });
}

/** Creates a document with an auto ID, as the calling user. `serverTimeFields` are set to request.time. */
export async function createDocument(collectionPath: string, data: Record<string, unknown>, idToken: string, serverTimeFields: string[] = []) {
  const docId = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  const name = `projects/${firebaseConfig.projectId}/databases/(default)/documents/${collectionPath}/${docId}`;
  const body = {
    writes: [
      {
        update: { name, fields: encodeFields(data) },
        currentDocument: { exists: false },
        ...(serverTimeFields.length ? { updateTransforms: serverTimeFields.map((f) => ({ fieldPath: f, setToServerValue: "REQUEST_TIME" })) } : {}),
      },
    ],
  };
  const res = await fetch(`${base().replace(/\/documents$/, "/documents:commit")}?key=${firebaseConfig.apiKey}`, { method: "POST", headers: headers(idToken), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Firestore commit failed: ${res.status} ${await res.text()}`);
  return docId;
}

/** Runs a structured query on a collection under `parentPath` (e.g. "gyms/x/workoutPlans/uid"). */
export async function runQuery(parentPath: string, collectionId: string, idToken: string, opts: { orderBy?: string; direction?: "ASCENDING" | "DESCENDING"; limit?: number } = {}) {
  const body = {
    structuredQuery: {
      from: [{ collectionId }],
      ...(opts.orderBy ? { orderBy: [{ field: { fieldPath: opts.orderBy }, direction: opts.direction ?? "DESCENDING" }] } : {}),
      ...(opts.limit ? { limit: opts.limit } : {}),
    },
  };
  const res = await fetch(`${base()}/${parentPath}:runQuery?key=${firebaseConfig.apiKey}`, { method: "POST", headers: headers(idToken), body: JSON.stringify(body), cache: "no-store" });
  if (!res.ok) throw new Error(`Firestore runQuery ${parentPath}/${collectionId} failed: ${res.status}`);
  const rows = (await res.json()) as { document?: { name: string; fields?: Record<string, FsValue> } }[];
  return rows.filter((r) => r.document).map((r) => ({ id: r.document!.name.split("/").pop()!, ...decodeFields(r.document!.fields ?? {}) }) as Record<string, unknown> & { id: string });
}
