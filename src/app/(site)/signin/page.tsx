import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/site-header";
import { SignInForm } from "@/components/site/signin-form";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false },
};

export default function SignInPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center">
        <div className="mx-auto w-full max-w-md px-4 py-12 sm:px-6">
          <h1 className="font-heading text-3xl leading-tight text-foreground">
            Sign in
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            We&apos;ll send you a code. No password to remember.
          </p>
          <div className="mt-7">
            <SignInForm />
          </div>
        </div>
      </main>
    </>
  );
}
