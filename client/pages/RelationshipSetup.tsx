import { useState } from "react";
import { ArrowRight, Heart, Mail, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PrivateMark } from "@/components/auth/AuthBoundary";
import { useRelationship } from "@/contexts/RelationshipContext";

const setupSchema = z.object({
  name: z.string().trim().min(2, "Give your relationship a name.").max(80, "Keep the name under 80 characters."),
  email: z.string().trim().email("Enter a valid email address."),
});

export default function RelationshipSetup() {
  const { createInvitation, createRelationship, error: loadError } = useRelationship();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(loadError);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();
  setError(null);

  const result = setupSchema.safeParse({ name, email });

  if (!result.success) {
    setError(result.error.issues[0]?.message ?? "Check your details.");
    return;
  }

  setSubmitting(true);

  try {
    const relationshipResult = await createRelationship(result.data.name);

    if (relationshipResult.error) {
      setError(relationshipResult.error.message);
      return;
    }

    if (!relationshipResult.relationship?.id) {
      setError(
        "Your space was created, but we couldn't identify it. Please try again.",
      );
      return;
    }

    const invitationResult = await createInvitation(
      result.data.email,
      relationshipResult.relationship.id,
    );

    if (invitationResult.error) {
      setError(
        `Your space is ready, but we couldn't save the invitation yet. ${invitationResult.error.message}`,
      );
      return;
    }

    navigate("/", { replace: true });
  } catch (error) {
    console.error("Relationship setup failed:", error);

    setError(
      error instanceof Error
        ? error.message
        : "Something went wrong while setting up your Loveline space.",
    );
  } finally {
    setSubmitting(false);
  }
}

  return (
    <div className="page-wash min-h-screen bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl items-center justify-center">
        <section className="w-full rounded-[28px] border border-border bg-surface px-6 py-9 shadow-elevated sm:px-12 sm:py-12">
          <div className="flex items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-subtle">
                <Heart className="size-4.25 fill-current" aria-hidden="true" />
              </span>
              <span className="font-display text-[25px] font-semibold leading-none">Loveline</span>
            </div>
            <PrivateMark />
          </div>

          <div className="mx-auto mt-14 max-w-xl text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary-soft text-primary-dark">
              <Users className="size-7" aria-hidden="true" />
            </div>
            <p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-primary-dark">One small beginning</p>
            <h1 className="font-display mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Make it yours.</h1>
            <p className="mx-auto mt-4 max-w-md text-base leading-7 text-muted-foreground">Name your little place and invite the person who makes it meaningful.</p>
          </div>

          {(error || loadError) && (
            <Alert variant="destructive" className="mx-auto mt-9 max-w-xl">
              <AlertTitle>We couldn&apos;t finish setting that up.</AlertTitle>
              <AlertDescription>{error ?? loadError}</AlertDescription>
            </Alert>
          )}

          <form className="mx-auto mt-9 max-w-xl space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="relationship-name">What should you call this place?</Label>
              <Input id="relationship-name" value={name} onChange={(event) => setName(event.target.value)} className="h-12 rounded-xl" placeholder="Our little world" disabled={submitting} />
              <p className="text-xs text-muted-foreground">This stays private and can be changed later.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipient-email">Who should receive the invitation?</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-muted-foreground" aria-hidden="true" />
                <Input id="recipient-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 rounded-xl pl-10" placeholder="someone-you-love@example.com" disabled={submitting} />
              </div>
              <p className="text-xs text-muted-foreground">We&apos;ll keep the invitation ready for the delivery step.</p>
            </div>
            <Button className="h-12 w-full rounded-full" type="submit" disabled={submitting}>
              {submitting ? "Setting up your space…" : "Create our Loveline"}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </form>

          <p className="mx-auto mt-8 flex max-w-xl items-center justify-center gap-2 text-center text-xs text-muted-foreground">
            <Heart className="size-3.5 fill-primary text-primary" aria-hidden="true" />
            Made with love. Delivered daily.
          </p>
        </section>
      </div>
    </div>
  );
}
