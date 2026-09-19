import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export type Relationship = {
  id: string;
  ownerId: string;
  name: string;
  createdAt: string;
};

type RelationshipContextValue = {
  relationship: Relationship | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createRelationship: (name: string) => Promise<{ error: Error | null; relationship?: Relationship }>;
  createInvitation: (email: string, relationshipId?: string) => Promise<{ error: Error | null }>;
};

const RelationshipContext = createContext<RelationshipContextValue | undefined>(
  undefined,
);

function mapRelationship(value: {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
}): Relationship {
  return {
    id: value.id,
    ownerId: value.owner_id,
    name: value.name,
    createdAt: value.created_at,
  };
}

async function ensureAuth(supabaseClient: NonNullable<typeof supabase>): Promise<boolean> {
  const { data: { user }, error } = await supabaseClient.auth.getUser();
  if (user) return true;

  console.error("getUser failed, attempting refresh:", error);
  const { data: { session }, error: refreshErr } = await supabaseClient.auth.refreshSession();
  if (session?.user) return true;

  console.error("Session refresh failed:", refreshErr);
  return false;
}

export function RelationshipProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [relationship, setRelationship] = useState<Relationship | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!supabase || !user) {
      console.debug("refresh: no supabase or user", { supabase: !!supabase, user: !!user });
      setRelationship(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    console.debug("refresh auth:", { authUser: authUser?.id, authError, contextUser: user?.id });
    if (!(await ensureAuth(supabase))) {
      setError("Your session has expired. Please sign in again.");
      setRelationship(null);
      setLoading(false);
      return;
    }

    const { data, error: queryError } = await supabase
      .from("relationships")
      .select("id, owner_id, name, created_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (queryError) {
      console.error("refresh relationships query failed:", queryError);
      setError("We couldn't load your Loveline space right now. Please try again.");
      setRelationship(null);
    } else {
      setRelationship(data ? mapRelationship(data) : null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<RelationshipContextValue>(
    () => ({
      relationship,
      loading,
      error,
      refresh,
      async createRelationship(name) {
  if (!supabase) {
    return {
      error: new Error("You need to be signed in to create a relationship."),
    };
  }

  const { data: { user: authUser }, error: authError } =
    await supabase.auth.getUser();

  console.debug("createRelationship auth:", {
    authUser: authUser?.id,
    authError,
  });

  if (authError || !authUser) {
    return {
      error: new Error("Your session has expired. Please sign in again."),
    };
  }

  const trimmedName = name.trim();

  if (!trimmedName) {
    return {
      error: new Error("Please enter a name for your Loveline space."),
    };
  }

  const { error: insertError } = await supabase
    .from("relationships")
    .insert({
      owner_id: authUser.id,
      name: trimmedName,
    });

  if (insertError) {
    console.error(
      "createRelationship insert failed:",
      JSON.stringify(insertError, null, 2),
    );

    if (insertError.code === "23505") {
      const { data: existing, error: existingError } = await supabase
        .from("relationships")
        .select("id, owner_id, name, created_at")
        .eq("owner_id", authUser.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (existingError) {
        console.error(
          "createRelationship recovery query failed:",
          existingError,
        );
      }

      if (existing) {
        const recovered = mapRelationship(existing);
        setRelationship(recovered);

        return {
          error: null,
          relationship: recovered,
        };
      }
    }

    return {
      error: new Error(
        `We couldn't create your Loveline space right now. Please try again. (${insertError.message})`,
      ),
    };
  }

  // The INSERT succeeded, but we intentionally don't use
  // .select() here because the INSERT itself was the RLS problem.
  // Fetch the newly-created relationship through the normal
  // relationship loading flow.
  const { data: created, error: fetchError } = await supabase
    .from("relationships")
    .select("id, owner_id, name, created_at")
    .eq("owner_id", authUser.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    console.error(
      "createRelationship fetch after insert failed:",
      fetchError,
    );

    // The relationship was already created successfully.
    // Refresh will attempt to load it again.
    await refresh();

    return {
      error: null,
    };
  }

  if (!created) {
    console.error(
      "createRelationship: insert succeeded but relationship could not be fetched.",
    );

    await refresh();

    return {
      error: null,
    };
  }

  const nextRelationship = mapRelationship(created);
  setRelationship(nextRelationship);

  return {
    error: null,
    relationship: nextRelationship,
  };
},
      async createInvitation(email, relationshipId) {
        const targetRelationshipId = relationshipId ?? relationship?.id;
        if (!supabase || !targetRelationshipId) {
          return { error: new Error("Create your relationship before inviting someone.") };
        }

        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        console.debug("createInvitation auth:", { authUser: authUser?.id, authError, targetRelationshipId });
        if (authError || !authUser) {
          return { error: new Error("Your session has expired. Please sign in again.") };
        }

        const { error: insertError } = await supabase
          .from("relationship_invitations")
          .insert({
            relationship_id: targetRelationshipId,
            inviter_id: authUser.id,
            invitee_email: email,
          });

        if (insertError) {
          console.error("createInvitation insert failed:", insertError);
          return { error: new Error("We couldn't save the invitation right now. Please try again.") };
        }

        return { error: null };
      },
    }),
    [error, loading, refresh, relationship, user],
  );

  return (
    <RelationshipContext.Provider value={value}>
      {children}
    </RelationshipContext.Provider>
  );
}

export function useRelationship() {
  const context = useContext(RelationshipContext);
  if (!context) {
    throw new Error("useRelationship must be used inside RelationshipProvider");
  }
  return context;
}
