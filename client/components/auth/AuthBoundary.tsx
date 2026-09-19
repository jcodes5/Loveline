import { Heart, LoaderCircle } from "lucide-react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { useRelationship } from "@/contexts/RelationshipContext";

function LoadingState({ label }: { label: string }) {
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

export function AuthBoundary() {
  const { ready, user } = useAuth();
  const location = useLocation();

  if (!ready) {
    return <LoadingState label="Opening your private Loveline…" />;
  }

  if (!user) {
    return (
      <Navigate
        to="/auth"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return <Outlet />;
}

export function RelationshipBoundary() {
  const { relationship, loading } = useRelationship();
  const location = useLocation();

  if (loading) {
    return <LoadingState label="Preparing your little place…" />;
  }

  if (!relationship && location.pathname !== "/setup") {
    return <Navigate to="/setup" replace />;
  }

  if (relationship && location.pathname === "/setup") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export function OwnerBoundary() {
  const { user } = useAuth();
  const { relationship, loading } = useRelationship();

  if (loading) {
    return <LoadingState label="Opening owner tools…" />;
  }

  if (!user || !relationship || relationship.ownerId !== user.id) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export function PrivateMark() {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
      <Heart className="size-3.5 fill-primary text-primary" aria-hidden="true" />
      Private by design
    </span>
  );
}
