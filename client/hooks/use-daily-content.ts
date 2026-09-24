import { useCallback, useEffect, useState } from "react";

import { useRelationship } from "@/contexts/RelationshipContext";
import { supabase } from "@/lib/supabase";

export type DailyContent = {
  id: string;
  contentDate: string;
  heroLabel: string;
  heroTitle: string;
  heroBody: string;
  noteBody: string;
  affirmation: string;
  affirmationDetail: string;
  quoteText: string;
  quoteAuthor: string;
  quoteSource: string | null;
  approvalStatus: "pending" | "approved" | "rejected";
};

type DailyContentStatus = "live" | "empty" | "error";

type DailyContentState = {
  content: DailyContent;
  loading: boolean;
  status: DailyContentStatus;
  retry: () => void;
};

const fallbackContent: DailyContent = {
  id: "fallback",
  contentDate: "",
  heroLabel: "A little something for today",
  heroTitle: "You are my favorite part of every day.",
  heroBody:
    "No big reason. Just a little reminder that you are loved, thought of, and worth celebrating in all the ordinary moments too.",
  noteBody:
    "Take your time this morning. There is nowhere else you need to be before you have had a moment to be kind to yourself.",
  affirmation: "I can move gently and still make progress.",
  affirmationDetail: "You do not have to rush to be deserving of a beautiful day.",
  quoteText: "There is no charm equal to tenderness of heart.",
  quoteAuthor: "Jane Austen",
  quoteSource: "Sense and Sensibility",
  approvalStatus: "approved",
};

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function mapDailyContent(value: {
  id: string;
  content_date: string;
  hero_label: string;
  hero_title: string;
  hero_body: string;
  note_body: string;
  affirmation: string;
  affirmation_detail: string;
  quote_text: string;
  quote_author: string;
  quote_source: string | null;
  approval_status: "pending" | "approved" | "rejected";
}): DailyContent {
  return {
    id: value.id,
    contentDate: value.content_date,
    heroLabel: value.hero_label,
    heroTitle: value.hero_title,
    heroBody: value.hero_body,
    noteBody: value.note_body,
    affirmation: value.affirmation,
    affirmationDetail: value.affirmation_detail,
    quoteText: value.quote_text,
    quoteAuthor: value.quote_author,
    quoteSource: value.quote_source,
    approvalStatus: value.approval_status,
  };
}

export function useDailyContent(): DailyContentState {
  const { relationship } = useRelationship();
  const [content, setContent] = useState(fallbackContent);
  const [loading, setLoading] = useState(Boolean(relationship));
  const [status, setStatus] = useState<DailyContentStatus>("empty");
  const [requestKey, setRequestKey] = useState(0);
  const contentDate = localDateKey(new Date());

  const retry = useCallback(() => setRequestKey((value) => value + 1), []);

  useEffect(() => {
    if (!relationship || !supabase) {
      setLoading(false);
      setStatus("empty");
      return;
    }

    let active = true;
    setLoading(true);

    supabase
      .from("daily_content")
      .select(
        "id, content_date, hero_label, hero_title, hero_body, note_body, affirmation, affirmation_detail, quote_text, quote_author, quote_source, approval_status",
      )
      .eq("relationship_id", relationship.id)
      .eq("content_date", contentDate)
      .eq("approval_status", "approved")
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;

        if (error) {
          setContent(fallbackContent);
          setStatus("error");
        } else if (data) {
          setContent(mapDailyContent(data));
          setStatus("live");
        } else {
          setContent(fallbackContent);
          setStatus("empty");
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [contentDate, relationship, requestKey]);

  return { content, loading, status, retry };
}

export function formatDailyDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}
