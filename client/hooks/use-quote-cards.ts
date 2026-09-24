import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useRelationship } from "@/contexts/RelationshipContext";

export type QuoteCardPalette = "rose" | "dusk" | "honey";
export type QuoteCardTemplate =
  | "minimal"
  | "romantic"
  | "editorial"
  | "polaroid"
  | "night"
  | "sunrise"
  | "memory"
  | "letterpress";
export type QuoteCardBgType = "template" | "gradient" | "image";
export type ArtisanalGradientKey =
  | "rose_dawn"
  | "lavender_dusk"
  | "golden_hour"
  | "twilight_velvet";
export type QuoteCardAlignment = "left" | "center" | "right";

export type QuoteCard = {
  id: string;
  relationshipId: string;
  createdBy: string;
  quoteText: string;
  quoteAuthor: string;
  quoteSource: string | null;
  palette: QuoteCardPalette;
  template: QuoteCardTemplate;
  bgType: QuoteCardBgType;
  gradient: ArtisanalGradientKey | null;
  backgroundDataUrl: string | null;
  alignment: QuoteCardAlignment;
  showDate: boolean;
  createdAt: string;
  imageUrl: string | null;
  svg: string;
};

export type QuoteCardInput = {
  quoteText: string;
  quoteAuthor: string;
  quoteSource: string | null;
  palette: QuoteCardPalette;
  template: QuoteCardTemplate;
  bgType: QuoteCardBgType;
  gradient: ArtisanalGradientKey | null;
  backgroundDataUrl: string | null;
  alignment: QuoteCardAlignment;
  showDate: boolean;
};

type CardsResponse = { cards: QuoteCard[] };
type CardResponse = { card: QuoteCard };

function authHeaders(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}

async function responseError(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  return payload?.error ?? fallback;
}

export function quoteCardImageUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function useQuoteCards() {
  const { session } = useAuth();
  const { relationship } = useRelationship();
  const [cards, setCards] = useState<QuoteCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session?.access_token || !relationship) {
      setCards([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const response = await fetch(
      `/api/quote-cards?relationshipId=${encodeURIComponent(relationship.id)}`,
      { headers: authHeaders(session.access_token) },
    );

    if (!response.ok) {
      setCards([]);
      setError(await responseError(response, "We couldn't load quote cards right now."));
    } else {
      const payload = (await response.json()) as CardsResponse;
      setCards(payload.cards);
    }
    setLoading(false);
  }, [relationship, session?.access_token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createCard = useCallback(
    async (input: QuoteCardInput) => {
      if (!session?.access_token || !relationship) {
        return { error: new Error("Your Loveline connection is not ready yet.") };
      }

      setSaving(true);
      setError(null);
      try {
        const response = await fetch("/api/quote-cards", {
          method: "POST",
          headers: {
            ...authHeaders(session.access_token),
            "content-type": "application/json",
          },
          body: JSON.stringify({ relationshipId: relationship.id, ...input }),
        });

        if (!response.ok) {
          return { error: new Error(await responseError(response, "We couldn't save that quote card right now.")) };
        }

        const payload = (await response.json()) as CardResponse;
        setCards((current) => [payload.card, ...current]);
        return { error: null, card: payload.card };
      } catch {
        return { error: new Error("We couldn't save that quote card right now.") };
      } finally {
        setSaving(false);
      }
    },
    [relationship, session?.access_token],
  );

  const renderCardPng = useCallback(
    async (input: QuoteCardInput) => {
      if (!session?.access_token || !relationship) {
        return { error: new Error("Your Loveline connection is not ready yet.") };
      }

      setSaving(true);
      setError(null);
      try {
        const response = await fetch("/api/quote-cards/render", {
          method: "POST",
          headers: {
            ...authHeaders(session.access_token),
            "content-type": "application/json",
          },
          body: JSON.stringify({ relationshipId: relationship.id, ...input }),
        });

        if (!response.ok) {
          return { error: new Error(await responseError(response, "We couldn't export that quote card right now.")) };
        }

        return { error: null, blob: await response.blob() };
      } catch {
        return { error: new Error("We couldn't export that quote card right now.") };
      } finally {
        setSaving(false);
      }
    },
    [relationship, session?.access_token],
  );

  const removeCard = useCallback(
    async (id: string) => {
      if (!session?.access_token) {
        return { error: new Error("Your Loveline connection is not ready yet.") };
      }

      setSaving(true);
      setError(null);
      const response = await fetch(`/api/quote-cards/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: authHeaders(session.access_token),
      });
      setSaving(false);

      if (!response.ok) {
        return { error: new Error(await responseError(response, "We couldn't remove that quote card right now.")) };
      }

      setCards((current) => current.filter((card) => card.id !== id));
      return { error: null };
    },
    [session?.access_token],
  );

  return { cards, loading, saving, error, refresh, createCard, removeCard, renderCardPng };
}
