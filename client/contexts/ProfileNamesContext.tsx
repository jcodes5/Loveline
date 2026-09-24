import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useRelationship } from "@/contexts/RelationshipContext";
import { supabase } from "@/lib/supabase";

type ProfileNamesValue = {
  displayName: string;
  partnerDisplayName: string;
  saveDisplayName: (name: string) => Promise<Error | null>;
};

const ProfileNamesContext = createContext<ProfileNamesValue | undefined>(undefined);

export function ProfileNamesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const [displayName, setDisplayName] = useState("");
  const [partnerDisplayName, setPartnerDisplayName] = useState("");

  useEffect(() => {
    let active = true;
    setDisplayName("");
    setPartnerDisplayName("");
    if (!supabase || !user || !relationship) return () => { active = false; };

    async function loadNames() {
      const { data: members, error: membersError } = await supabase!
        .from("relationship_members")
        .select("user_id")
        .eq("relationship_id", relationship!.id);
      if (membersError) return;

      const memberIds = [...new Set([user!.id, ...(members ?? []).map((member) => member.user_id)])];
      const { data: profiles, error } = await supabase!
        .from("profiles")
        .select("id, display_name")
        .in("id", memberIds);
      if (error || !active) return;

      setDisplayName(profiles?.find((profile) => profile.id === user!.id)?.display_name ?? "");
      setPartnerDisplayName(profiles?.find((profile) => profile.id !== user!.id)?.display_name ?? "");
    }

    void loadNames();
    return () => { active = false; };
  }, [relationship?.id, user?.id]);

  const saveDisplayName = useCallback(async (name: string) => {
    if (!supabase || !user) return new Error("Sign in to update your name.");
    const normalized = name.trim();
    if (!normalized || normalized.length > 120) return new Error("Use a name between 1 and 120 characters.");

    const { error } = await supabase
      .from("profiles")
      .update({ display_name: normalized, updated_at: new Date().toISOString() })
      .eq("id", user.id);
    if (error) return new Error("We couldn't save your Loveline name. Please try again.");

    setDisplayName(normalized);
    await supabase.auth.updateUser({ data: { display_name: normalized } });
    return null;
  }, [user]);

  const value = useMemo(() => ({ displayName, partnerDisplayName, saveDisplayName }), [displayName, partnerDisplayName, saveDisplayName]);
  return <ProfileNamesContext.Provider value={value}>{children}</ProfileNamesContext.Provider>;
}

export function useProfileNames() {
  const context = useContext(ProfileNamesContext);
  if (!context) throw new Error("useProfileNames must be used inside ProfileNamesProvider");
  return context;
}
