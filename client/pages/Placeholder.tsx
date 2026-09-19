import type { LucideIcon } from "lucide-react";
import { ArrowLeft, ArrowRight, Heart } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

type PlaceholderPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
};

export default function PlaceholderPage({
  eyebrow,
  title,
  description,
  icon: Icon,
  accent,
}: PlaceholderPageProps) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-6xl items-center px-4 py-12 sm:px-6 lg:px-8">
      <section className="relative w-full overflow-hidden rounded-[28px] border border-border bg-surface px-6 py-12 text-center shadow-card sm:px-12 sm:py-16">
        <div
          aria-hidden="true"
          className={`absolute -right-20 -top-24 size-64 rounded-full blur-3xl ${accent}`}
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-32 -left-16 size-64 rounded-full bg-primary-soft/50 blur-3xl"
        />
        <div className="relative mx-auto max-w-xl">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary-soft text-primary-dark shadow-subtle">
            <Icon className="size-7" aria-hidden="true" />
          </div>
          <p className="mt-7 text-xs font-semibold uppercase tracking-[0.2em] text-primary-dark">
            {eyebrow}
          </p>
          <h1 className="font-display mt-3 text-4xl font-semibold tracking-[-0.03em] text-foreground sm:text-5xl">
            {title}
          </h1>
          <p className="mx-auto mt-5 max-w-md text-base leading-7 text-muted-foreground sm:text-lg">
            {description}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild className="h-11 rounded-full px-6 shadow-subtle">
              <Link to="/">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back to home
              </Link>
            </Button>
            <Button asChild variant="ghost" className="h-11 rounded-full px-6">
              <Link to="/">
                Keep exploring
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
          <p className="mt-10 inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Heart className="size-3.5 fill-primary text-primary" aria-hidden="true" />
            A little place for love, every day.
          </p>
        </div>
      </section>
    </div>
  );
}
