import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Heart, Link2, LockKeyhole, Mail } from "lucide-react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";

import { PrivateMark } from "@/components/auth/AuthBoundary";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

const emailSchema = z.string().trim().email("Enter a valid email address.");
const passwordSchema = z.string().min(8, "Use at least 8 characters for your password.");
const credentialsSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

type AuthMode = "sign-in" | "sign-up" | "reset" | "update-password";

type AuthMessage = {
  type: "error" | "success";
  text: string;
};

export default function Auth() {
  const {
    configured,
    user,
    signInWithPassword,
    signUpWithPassword,
    sendMagicLink,
    resetPassword,
    updatePassword,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>(() => {
    const requestedMode = searchParams.get("mode");
    return requestedMode === "reset" || requestedMode === "update-password"
      ? requestedMode
      : "sign-in";
  });
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<AuthMessage | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const returnTo = useMemo(
    () => (location.state as { from?: string } | null)?.from ?? "/",
    [location.state],
  );

  useEffect(() => {
    if (user && mode !== "update-password") {
      navigate(returnTo, { replace: true });
    }
  }, [mode, navigate, returnTo, user]);

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setMessage(null);
    setPassword("");
    setConfirmPassword("");
  }

  async function handleCredentials(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const result = credentialsSchema.safeParse({ email, password });

    if (!result.success) {
      setMessage({ type: "error", text: result.error.issues[0]?.message ?? "Check your details." });
      return;
    }

    if (mode === "sign-up" && !displayName.trim()) {
      setMessage({ type: "error", text: "Add your name so Loveline can feel like yours." });
      return;
    }

    setSubmitting(true);
    const response =
      mode === "sign-in"
        ? await signInWithPassword(email.trim(), password)
        : await signUpWithPassword(email.trim(), password, displayName.trim());
    setSubmitting(false);

    if (response.error) {
      setMessage({ type: "error", text: response.error.message });
      return;
    }

    setMessage({
      type: "success",
      text: response.message ?? "You are in. Welcome to Loveline.",
    });
  }

  async function handleMagicLink() {
    setMessage(null);
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setMessage({ type: "error", text: result.error.issues[0]?.message ?? "Enter your email first." });
      return;
    }

    setSubmitting(true);
    const response = await sendMagicLink(email.trim());
    setSubmitting(false);
    setMessage(
      response.error
        ? { type: "error", text: response.error.message }
        : { type: "success", text: response.message ?? "Your magic link is on its way." },
    );
  }

  async function handleReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setMessage({ type: "error", text: result.error.issues[0]?.message ?? "Enter your email first." });
      return;
    }

    setSubmitting(true);
    const response = await resetPassword(email.trim());
    setSubmitting(false);
    setMessage(
      response.error
        ? { type: "error", text: response.error.message }
        : { type: "success", text: response.message ?? "Check your email for a reset link." },
    );
  }

  async function handleUpdatePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const result = passwordSchema.safeParse(password);
    if (!result.success) {
      setMessage({ type: "error", text: result.error.issues[0]?.message ?? "Choose a stronger password." });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "Your passwords need to match." });
      return;
    }

    setSubmitting(true);
    const response = await updatePassword(password);
    setSubmitting(false);
    if (response.error) {
      setMessage({ type: "error", text: response.error.message });
      return;
    }

    navigate(returnTo, { replace: true });
  }

  const isUpdatePassword = mode === "update-password";

  return (
    <div className="page-wash min-h-screen bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[28px] border border-border bg-surface shadow-elevated lg:grid-cols-[0.9fr_1.1fr]">
          <section className="relative hidden overflow-hidden bg-[#30242a] px-10 py-12 text-[#fff8f6] lg:flex lg:min-h-[680px] lg:flex-col lg:justify-between lg:px-12">
            <div aria-hidden="true" className="absolute -right-24 -top-20 size-80 rounded-full bg-primary/30 blur-3xl" />
            <div aria-hidden="true" className="absolute -bottom-36 -left-16 size-80 rounded-full border-[42px] border-primary/15" />
            <div className="relative">
              <Link to="/" className="inline-flex items-center gap-2.5 text-white" aria-label="Loveline home">
                <span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Heart className="size-[17px] fill-current" aria-hidden="true" />
                </span>
                <span className="font-display text-[25px] font-semibold">Loveline</span>
              </Link>
              <p className="mt-20 max-w-sm font-display text-5xl font-semibold leading-[0.98] tracking-[-0.04em]">
                A little place for love, every day.
              </p>
            </div>
            <p className="relative max-w-xs text-sm leading-6 text-white/60">
              Your messages, memories, and quiet moments belong somewhere private.
            </p>
          </section>

          <section className="px-6 py-9 sm:px-12 sm:py-12">
            <div className="mx-auto max-w-md">
              <div className="flex items-center justify-between gap-4">
                <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground lg:hidden">
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  Loveline
                </Link>
                <PrivateMark />
              </div>

              <div className="mt-12">
                {mode === "reset" ? (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-dark">Welcome back</p>
                    <h1 className="font-display mt-3 text-4xl font-semibold tracking-[-0.04em]">Reset your password.</h1>
                    <p className="mt-4 text-sm leading-6 text-muted-foreground">We&apos;ll send a quiet little link to your inbox.</p>
                  </>
                ) : isUpdatePassword ? (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-dark">One more step</p>
                    <h1 className="font-display mt-3 text-4xl font-semibold tracking-[-0.04em]">Choose a new password.</h1>
                    <p className="mt-4 text-sm leading-6 text-muted-foreground">A fresh key for your private place.</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-dark">Your private place</p>
                    <h1 className="font-display mt-3 text-4xl font-semibold tracking-[-0.04em]">
                      {mode === "sign-in" ? "Welcome back." : "Make room for love."}
                    </h1>
                    <p className="mt-4 text-sm leading-6 text-muted-foreground">
                      {mode === "sign-in" ? "Come back to the little things that matter." : "Start a private space for the moments you want to keep close."}
                    </p>
                  </>
                )}
              </div>

              {!configured && (
                <Alert className="mt-7 border-warning/25 bg-warning/10 text-foreground">
                  <Link2 className="size-4" aria-hidden="true" />
                  <AlertTitle>Account connection is not configured yet</AlertTitle>
                  <AlertDescription className="mt-1 text-muted-foreground">
                    Add the Supabase URL and anonymous key to this environment before using sign-in.
                  </AlertDescription>
                </Alert>
              )}

              {message && (
                <Alert variant={message.type === "error" ? "destructive" : "default"} className="mt-7">
                  {message.type === "success" ? <Heart className="size-4 fill-primary text-primary" aria-hidden="true" /> : <LockKeyhole className="size-4" aria-hidden="true" />}
                  <AlertDescription>{message.text}</AlertDescription>
                </Alert>
              )}

              {mode === "reset" ? (
                <form className="mt-7 space-y-5" onSubmit={handleReset}>
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email address</Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden="true" />
                      <Input id="reset-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-11 rounded-xl pl-10" placeholder="you@example.com" disabled={!configured || submitting} />
                    </div>
                  </div>
                  <Button className="h-11 w-full rounded-full" type="submit" disabled={!configured || submitting}>
                    {submitting ? "Sending…" : "Send reset link"}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Button>
                  <button type="button" className="mx-auto flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground" onClick={() => changeMode("sign-in")}>
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    Back to sign in
                  </button>
                </form>
              ) : isUpdatePassword ? (
                <form className="mt-7 space-y-5" onSubmit={handleUpdatePassword}>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New password</Label>
                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden="true" />
                      <Input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 rounded-xl pl-10" placeholder="At least 8 characters" disabled={!configured || submitting} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm password</Label>
                    <Input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="h-11 rounded-xl" placeholder="Type it once more" disabled={!configured || submitting} />
                  </div>
                  <Button className="h-11 w-full rounded-full" type="submit" disabled={!configured || submitting}>
                    {submitting ? "Updating…" : "Update password"}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Button>
                </form>
              ) : (
                <>
                  <div className="mt-7 grid grid-cols-2 rounded-full bg-surface-muted p-1" role="tablist" aria-label="Authentication mode">
                    <button type="button" role="tab" aria-selected={mode === "sign-in"} className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${mode === "sign-in" ? "bg-surface text-foreground shadow-subtle" : "text-muted-foreground"}`} onClick={() => changeMode("sign-in")}>Sign in</button>
                    <button type="button" role="tab" aria-selected={mode === "sign-up"} className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${mode === "sign-up" ? "bg-surface text-foreground shadow-subtle" : "text-muted-foreground"}`} onClick={() => changeMode("sign-up")}>Create account</button>
                  </div>

                  <form className="mt-7 space-y-5" onSubmit={handleCredentials}>
                    {mode === "sign-up" && (
                      <div className="space-y-2">
                        <Label htmlFor="display-name">Your name</Label>
                        <Input id="display-name" autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="h-11 rounded-xl" placeholder="The person behind the love" disabled={!configured || submitting} />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="email">Email address</Label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden="true" />
                        <Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-11 rounded-xl pl-10" placeholder="you@example.com" disabled={!configured || submitting} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <Label htmlFor="password">Password</Label>
                        {mode === "sign-in" && <button type="button" className="text-xs font-semibold text-primary-dark hover:text-primary" onClick={() => changeMode("reset")}>Forgot password?</button>}
                      </div>
                      <div className="relative">
                        <LockKeyhole className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden="true" />
                        <Input id="password" type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 rounded-xl pl-10" placeholder="At least 8 characters" disabled={!configured || submitting} />
                      </div>
                    </div>
                    <Button className="h-11 w-full rounded-full" type="submit" disabled={!configured || submitting}>
                      {submitting ? "Opening…" : mode === "sign-in" ? "Open Loveline" : "Create my space"}
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Button>
                  </form>

                  <div className="my-7 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
                  <Button variant="outline" className="h-11 w-full rounded-full" type="button" onClick={handleMagicLink} disabled={!configured || submitting}>
                    <Link2 className="size-4" aria-hidden="true" />
                    Send me a magic link
                  </Button>
                </>
              )}

              <p className="mt-9 text-center text-xs leading-5 text-muted-foreground">
                By continuing, you&apos;re creating a private place for your relationship.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
