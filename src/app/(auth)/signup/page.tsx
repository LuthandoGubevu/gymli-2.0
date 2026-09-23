import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupWizard } from "./signup-wizard";

export const metadata: Metadata = { title: "Create your account" };

export default function SignupPage() {
  return (
    <Suspense>
      <SignupWizard />
    </Suspense>
  );
}
