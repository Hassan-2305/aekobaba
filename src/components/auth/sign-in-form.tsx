"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import {
  beginGoogleSignInAction,
  sendMagicLinkAction,
  signInWithPasswordAction,
  type AuthFormState,
} from "@/app/auth/actions";

import { FormField } from "./form-field";
import { SubmitButton } from "./submit-button";

const INITIAL_STATE: AuthFormState = {};

// Sign-in offers three paths: password, emailed magic link, and Google.
// The mode toggle keeps each form small and every state honest.

export function SignInForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"password" | "magic-link">("password");
  const [passwordState, submitPassword] = useActionState(signInWithPasswordAction, INITIAL_STATE);
  const [magicState, submitMagic] = useActionState(sendMagicLinkAction, INITIAL_STATE);
  const [googleState, submitGoogle] = useActionState(beginGoogleSignInAction, INITIAL_STATE);

  if (mode === "magic-link") {
    return (
      <div className="space-y-4">
        <form action={submitMagic} className="space-y-4" noValidate>
          <input type="hidden" name="next" value={next} />
          {magicState.error ? <ErrorAlert message={magicState.error} /> : null}
          {magicState.checkEmail ? (
            <SuccessAlert message="Check your inbox — we sent a sign-in link. It expires in a while, so use it soon." />
          ) : null}
          <FormField
            id="magic-email"
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@company.com"
            error={magicState.fieldErrors?.email}
          />
          <SubmitButton pendingLabel="Sending link…">Send a sign-in link</SubmitButton>
        </form>
        <button
          type="button"
          onClick={() => setMode("password")}
          className="text-sm text-ink-muted underline decoration-ink/20 underline-offset-4 hover:text-ink hover:decoration-orange"
        >
          Use a password instead
        </button>
        <GoogleButton next={next} state={googleState} onSubmit={submitGoogle} />
        <SignUpLink next={next} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form action={submitPassword} className="space-y-4" noValidate>
        <input type="hidden" name="next" value={next} />
        {passwordState.error ? <ErrorAlert message={passwordState.error} /> : null}
        <FormField
          id="email"
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@company.com"
          error={passwordState.fieldErrors?.email}
        />
        <FormField
          id="password"
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          error={passwordState.fieldErrors?.password}
        />
        <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
      </form>
      <OrDivider />
      <GoogleButton next={next} state={googleState} onSubmit={submitGoogle} />
      <button
        type="button"
        onClick={() => setMode("magic-link")}
        className="text-sm text-ink-muted underline decoration-ink/20 underline-offset-4 hover:text-ink hover:decoration-orange"
      >
        Email me a sign-in link instead
      </button>
      <SignUpLink next={next} />
    </div>
  );
}

function GoogleButton({
  next,
  state,
  onSubmit,
}: {
  next: string;
  state: AuthFormState;
  onSubmit: (formData: FormData) => void;
}) {
  return (
    <div className="space-y-2">
      <form action={onSubmit}>
        <input type="hidden" name="next" value={next} />
        <SubmitButton variant="secondary" pendingLabel="Opening Google…">
          Continue with Google
        </SubmitButton>
      </form>
      {state.error ? <ErrorAlert message={state.error} /> : null}
    </div>
  );
}

function OrDivider() {
  return (
    <div
      className="flex items-center gap-4 text-xs uppercase tracking-[0.12em] text-ink-faint"
      aria-hidden
    >
      <span className="h-px flex-1 bg-line" />
      or
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

function SignUpLink({ next }: { next: string }) {
  return (
    <p className="pt-2 text-sm text-ink-muted">
      New to Aekobaba?{" "}
      <Link
        href={next === "/" ? "/auth/sign-up" : `/auth/sign-up?next=${encodeURIComponent(next)}`}
        className="font-medium text-ink underline decoration-orange underline-offset-4 hover:text-orange-ink"
      >
        Create an account
      </Link>
    </p>
  );
}

export function ErrorAlert({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="border-l-2 border-danger-ink bg-danger-tint px-3 py-2 text-sm text-danger-ink"
    >
      {message}
    </p>
  );
}

export function SuccessAlert({ message }: { message: string }) {
  return (
    <p
      role="status"
      className="border-l-2 border-success-ink bg-success-tint px-3 py-2 text-sm text-success-ink"
    >
      {message}
    </p>
  );
}
