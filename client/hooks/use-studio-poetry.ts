import { useCallback, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";

export type StudioPoem = {
  title: string;
  poem: string;
};

export function useStudioPoetry() {
  const { session } = useAuth();
  const [poem, setPoem] = useState<StudioPoem | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePoem = useCallback(
    async (context: { relationshipId?: string; relationshipName?: string; theme?: string; tone?: string; style?: string }) => {
      if (!session?.access_token) {
        return { error: new Error("Sign in to use the poem maker.") };
      }

      setGenerating(true);
      setError(null);
      try {
        const response = await fetch("/api/ai/draft", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ type: "poetry", context }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          setError(payload?.error ?? "We couldn't write that poem right now.");
          return { error: new Error(payload?.error ?? "We couldn't write that poem right now.") };
        }

        const data = (await response.json()) as { draft: { poem?: string; title?: string } };
        const nextPoem = {
          title: data.draft.title?.trim() ? data.draft.title.trim() : "Untitled",
          poem: data.draft.poem ?? "",
        };
        setPoem(nextPoem);
        return { error: null, poem: nextPoem };
      } catch {
        return { error: new Error("We couldn't write that poem right now.") };
      } finally {
        setGenerating(false);
      }
    },
    [session?.access_token],
  );

  return { poem, generating, error, generatePoem, setPoem };
}