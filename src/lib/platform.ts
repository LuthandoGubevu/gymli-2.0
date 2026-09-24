// Platform super admins (the Gymli team). MUST match superAdmins() in firestore.rules —
// the rules are what actually grant access; tests/unit/logic.test.ts checks they agree.
// Powers only apply once the address is verified, so signing up with it isn't enough.
export const SUPER_ADMIN_EMAILS = ["lgubevu@gmail.com"];

export function isSuperAdminEmail(email: string | null | undefined) {
  return !!email && SUPER_ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

export function isSuperAdmin(user: { email: string | null; emailVerified: boolean } | null | undefined) {
  return !!user && user.emailVerified && isSuperAdminEmail(user.email);
}
