import { useEffect, useMemo, useRef, useState } from "react";
import { Heart, Link2, LoaderCircle } from "lucide-react";
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
  const autoAccepted = useRef(false);

  const inviteToken = useMemo(() => token?.trim() ?? "", [token]);

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

  if (!ready) {
    return <LoadingPulse label="Opening your private Loveline…" />;
  }

  if (relationship) {
    return <Navigate to="/" replace />;
  }

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
                <Button className="h-11 w-full rounded-full sm:w-auto sm:px-8" onClick={() => void handleAccept()} disabled={!configured || !inviteToken}>
                  <Heart className="size-4 fill-current" aria-hidden="true" />
                  Try again
                </Button>
                <Button variant="ghost" className="h-11 rounded-full text-muted-foreground" onClick={() => navigate("/auth", { replace: true })}>
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
                <p className="mx-auto mt-4 max-w-md text-base leading-7 text-muted-foreground">Accept it and you&apos;re straight in — no setup, no second space. It&apos;s just the two of you in here.</p>
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
                <Button className="h-11 w-full rounded-full sm:w-auto sm:px-8" onClick={() => void handleAccept()} disabled={!configured || !inviteToken}>
                  <Heart className="size-4 fill-current" aria-hidden="true" />
                  Accept the invitation
                </Button>
                <Button variant="ghost" className="h-11 rounded-full text-muted-foreground" onClick={() => navigate("/auth", { replace: true })}>
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