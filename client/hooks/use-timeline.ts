import { useCallback, useMemo } from "react";

import { useLoveReactions, type LoveReaction } from "@/hooks/use-love-reactions";
import { useMemories, type Memory } from "@/hooks/use-memories";
import { useSpecialDates, type SpecialDate, type SpecialDateKind } from "@/hooks/use-special-dates";

export type TimelineItem =
  | {
      id: string;
      type: "date";
      sortDate: string;
      eventDate: string;
      label: string;
      notes: string;
      kind: SpecialDateKind;
    }
  | {
      id: string;
      type: "memory";
      sortDate: string;
      eventDate: string | null;
      caption: string;
      url: string;
    }
  | {
      id: string;
      type: "reaction";
      sortDate: string;
      createdAt: string;
      senderId: string;
      cardId: string | null;
      kind: string;
      note: string | null;
    };

function memorySortDate(memory: Memory) {
  return memory.takenAt ?? memory.createdAt.slice(0, 10);
}

export function buildTimelineItems(
  dates: SpecialDate[],
  memories: Memory[],
  reactions: LoveReaction[],
): TimelineItem[] {
  const dateItems: TimelineItem[] = dates.map((date) => ({
    id: `date-${date.id}`,
    type: "date",
    sortDate: date.eventDate,
    eventDate: date.eventDate,
    label: date.label,
    notes: date.notes,
    kind: date.kind,
  }));

  const memoryItems: TimelineItem[] = memories.map((memory) => ({
    id: `memory-${memory.id}`,
    type: "memory",
    sortDate: memorySortDate(memory),
    eventDate: memory.takenAt,
    caption: memory.caption,
    url: memory.url,
  }));

  const reactionItems: TimelineItem[] = reactions.map((reaction) => ({
    id: `reaction-${reaction.id}`,
    type: "reaction",
    sortDate: reaction.createdAt.slice(0, 10),
    createdAt: reaction.createdAt,
    senderId: reaction.senderId,
    cardId: reaction.cardId,
    kind: reaction.kind,
    note: reaction.note,
  }));

  const typeOrder: Record<TimelineItem["type"], number> = { date: 0, memory: 1, reaction: 2 };
  return [...dateItems, ...memoryItems, ...reactionItems].sort((first, second) => {
    const dateOrder = first.sortDate.localeCompare(second.sortDate);
    if (dateOrder !== 0) return dateOrder;
    if (first.type !== second.type) return typeOrder[first.type] - typeOrder[second.type];
    if (first.type === "reaction" && second.type === "reaction") {
      return first.createdAt.localeCompare(second.createdAt);
    }
    return 0;
  });
}

export function useTimeline() {
  const specialDates = useSpecialDates();
  const memories = useMemories();
  const loveReactions = useLoveReactions();
  const items = useMemo(
    () => buildTimelineItems(specialDates.dates, memories.memories, loveReactions.reactions),
    [loveReactions.reactions, memories.memories, specialDates.dates],
  );

  const refresh = useCallback(async () => {
    await Promise.all([specialDates.refresh(), memories.refresh(), loveReactions.refresh()]);
  }, [loveReactions.refresh, memories.refresh, specialDates.refresh]);

  return {
    items,
    daysTogether: specialDates.daysTogether,
    loading: specialDates.loading || memories.loading || loveReactions.loading,
    error: specialDates.error ?? memories.error ?? loveReactions.error,
    refresh,
  };
}
