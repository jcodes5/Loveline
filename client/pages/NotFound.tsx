import { Heart } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  return (
    <div className="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-6xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <section className="max-w-md text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-primary-soft text-primary-dark">
          <Heart className="size-7 fill-current" aria-hidden="true" />
        </div>
        <p className="mt-7 text-xs font-semibold uppercase tracking-[0.2em] text-primary-dark">
          A wrong turn
        </p>
        <h1 className="font-display mt-3 text-5xl font-semibold tracking-[-0.04em]">
          This little place is missing.
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          We couldn&apos;t find <span className="font-medium text-foreground">{location.pathname}</span>.
        </p>
        <Button asChild className="mt-8 h-11 rounded-full px-6">
          <Link to="/">Take me home</Link>
        </Button>
      </section>
    </div>
  );
};

export default NotFound;
