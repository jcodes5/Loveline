import { useEffect, useMemo, useRef, useState } from "react";
import { Heart, Link2, LoaderCircle, Mail, RefreshCw } from "lucide-react";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PrivateMark } from "@/components/auth/AuthBoundary";
import { useAuth } from "@/contexts/AuthContext";
import { useRelationship } from "@/contexts/RelationshipContext";
import { Reveal } from "@/components/motion/Reveal";

export default function AcceptInvite() {
  const { token } = useParams();
  const { configured, user, ready } = useAuth();
  const { relationship, acceptInvitation, refresh } = useRelationship();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const autoAccepted = useRef(false);
  const autoSent = useRef(false);

  const inviteToken = useMemo(() => token?.trim() ?? "", [token]);
  const isGuest = !user;

  async function handleSendSignInLink() {
    if (sending) return;
    setError(null);
    setSending(true);
    try {
      const response = await fetch(
        `/api/invites/${encodeURIComponent(inviteToken)}/sign-in-link`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
        },
      );
      const body = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !body?.ok) {
        setError(body?.error ?? "We couldn't send your magic link right now. Please try again.");
        return;
      }
      setSent(true);
    } catch {
      setError("We couldn't send your magic link right now. Please try again.");
    } finally {
      setSending(false);
    }
  }

  async function handleAccept() {
    setError(null);
    setSubmitting(true);
    const result = await acceptInvitation(inviteToken);
    setSubmitting(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    await refresh();
    navigate("/", { replace: true });
  }

  useEffect(() => {
    if (!ready || !user || relationship || submitting || autoAccepted.current) return;
    if (!inviteToken) return;
    autoAccepted.current = true;
    void handleAccept();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user, relationship, submitting, inviteToken]);

  useEffect(() => {
    if (!ready || user || sent || sending || autoSent.current || !configured) return;
    if (!inviteToken) return;
    autoSent.current = true;
    void handleSendSignInLink();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user, sent, sending, configured, inviteToken]);

  if (!ready) {
    return <LoadingPulse label="Opening your private Loveline…" />;
  }

  if (relationship) {
    return <Navigate to="/" replace />;
  }

  const switchAccount = () =>
    navigate("/auth", {
      replace: true,
      state: { from: `/invite/${inviteToken}` },
    });

  const retryAction = isGuest ? handleSendSignInLink : handleAccept;
  const primaryBusy = isGuest ? sending : submitting;

  return (
    <div className="page-wash min-h-screen bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl items-center justify-center">
        <Reveal className="w-full" y={24} once>
          <section className="w-full rounded-[28px] border border-border bg-surface px-6 py-9 text-center shadow-elevated sm:px-12 sm:py-12">
          <div className="flex items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-subtle">
                <Heart className="size-4.25 fill-current" aria-hidden="true" />
              </span>
              <span className="font-display text-[25px] font-semibold leading-none">Loveline</span>
            </div>
            <PrivateMark />
          </div>

          {submitting ? (
            <>
              <div className="mx-auto mt-12 max-w-xl">
                <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary-soft text-primary-dark">
                  <LoaderCircle className="size-7 animate-spin" aria-hidden="true" />
                </div>
                <h1 className="mx-auto mt-7 font-display text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Opening your space…</h1>
                <p className="mx-auto mt-4 max-w-md text-base leading-7 text-muted-foreground">You won&apos;t need to set anything up — the two of you are all set to begin.</p>
              </div>
            </>
          ) : error ? (
            <>
              <div className="mx-auto mt-12 max-w-xl">
                <Alert variant="destructive">
                  <AlertTitle>That invitation couldn&apos;t be opened.</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </div>
              <div className="mx-auto mt-7 flex max-w-xl flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Button className="h-11 w-full rounded-full sm:w-auto sm:px-8" onClick={() => void retryAction()} disabled={!configured || primaryBusy}>
                  {primaryBusy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Heart className="size-4 fill-current" aria-hidden="true" />}
                  Try again
                </Button>
                <Button variant="ghost" className="h-11 rounded-full text-muted-foreground" onClick={switchAccount}>
                  Use a different account
                </Button>
              </div>
            </>
          ) : isGuest && sending ? (
            <>
              <div className="mx-auto mt-12 max-w-xl">
                <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary-soft text-primary-dark">
                  <LoaderCircle className="size-7 animate-spin" aria-hidden="true" />
                </div>
                <p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-primary-dark">Opening your invitation</p>
                <h1 className="font-display mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Sending your magic link…</h1>
                <p className="mx-auto mt-4 max-w-md text-base leading-7 text-muted-foreground">A quiet link is being prepared for the invited email. It will sign you straight in — no password, no setup.</p>
              </div>
              <div className="mx-auto mt-7 max-w-xl">
                <Button variant="ghost" className="h-11 rounded-full text-muted-foreground" onClick={switchAccount}>
                  Use a different account
                </Button>
              </div>
            </>
          ) : isGuest && sent ? (
            <>
              <div className="mx-auto mt-12 max-w-xl">
                <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary-soft text-primary-dark">
                  <Mail className="size-7" aria-hidden="true" />
                </div>
                <p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-primary-dark">Check your inbox</p>
                <h1 className="font-display mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">A quiet link is on its way.</h1>
                <p className="mx-auto mt-4 max-w-md text-base leading-7 text-muted-foreground">The email this invitation was made for will receive a link that opens your invitation and signs you straight in. No password, no setup.</p>
              </div>
              <div className="mx-auto mt-7 flex max-w-xl flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Button variant="outline" className="h-11 rounded-full sm:px-6" onClick={() => void handleSendSignInLink()} disabled={sending || !inviteToken}>
                  {sending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-4" aria-hidden="true" />}
                  Send it again
                </Button>
                <Button variant="ghost" className="h-11 rounded-full text-muted-foreground" onClick={switchAccount}>
                  Use a different account
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="mx-auto mt-12 max-w-xl">
                <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary-soft text-primary-dark">
                  <Link2 className="size-7" aria-hidden="true" />
                </div>
                <p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-primary-dark">You&apos;ve been invited</p>
                <h1 className="font-display mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Someone built you a little place.</h1>
                <p className="mx-auto mt-4 max-w-md text-base leading-7 text-muted-foreground">{isGuest ? "Accept it and you're straight in — no setup, no second space. A magic link to the invited email will take you there." : "Accept it and you're straight in — no setup, no second space. It's just the two of you in here."}</p>
              </div>

              {!configured && (
                <Alert className="mx-auto mt-8 max-w-xl border-warning/25 bg-warning/10 text-foreground">
                  <AlertTitle>Loveline isn&apos;t connected yet</AlertTitle>
                  <AlertDescription className="mt-1 text-muted-foreground">
                    Add the Supabase URL and anonymous key to this environment before accepting invitations.
                  </AlertDescription>
                </Alert>
              )}

              <div className="mx-auto mt-9 flex max-w-xl flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Button className="h-11 w-full rounded-full sm:w-auto sm:px-8" onClick={() => void (isGuest ? handleSendSignInLink() : handleAccept())} disabled={!configured || primaryBusy || !inviteToken}>
                  {primaryBusy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : isGuest ? <Mail className="size-4" aria-hidden="true" /> : <Heart className="size-4 fill-current" aria-hidden="true" />}
                  {isGuest ? "Send me a magic link" : "Accept the invitation"}
                </Button>
                <Button variant="ghost" className="h-11 rounded-full text-muted-foreground" onClick={switchAccount}>
                  Use a different account
                </Button>
              </div>
            </>
          )}
        </section>
        </Reveal>
      </div>
    </div>
  );
}

function LoadingPulse({ label }: { label: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-6 text-center">
      <div>
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-primary-soft text-primary-dark">
          <LoaderCircle className="size-6 animate-spin" aria-hidden="true" />
        </div>
        <p className="mt-5 text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}