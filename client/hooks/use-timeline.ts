import { useCallback, useMemo } from "react";

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
    };

function memorySortDate(memory: Memory) {
  return memory.takenAt ?? memory.createdAt.slice(0, 10);
}

export function buildTimelineItems(
  dates: SpecialDate[],
  memories: Memory[],
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

  return [...dateItems, ...memoryItems].sort((first, second) => {
    const dateOrder = first.sortDate.localeCompare(second.sortDate);
    if (dateOrder !== 0) return dateOrder;
    return first.type === second.type ? 0 : first.type === "date" ? -1 : 1;
  });
}

export function useTimeline() {
  const specialDates = useSpecialDates();
  const memories = useMemories();
  const items = useMemo(
    () => buildTimelineItems(specialDates.dates, memories.memories),
    [memories.memories, specialDates.dates],
  );

  const refresh = useCallback(async () => {
    await Promise.all([specialDates.refresh(), memories.refresh()]);
  }, [memories.refresh, specialDates.refresh]);

  return {
    items,
    daysTogether: specialDates.daysTogether,
    loading: specialDates.loading || memories.loading,
    error: specialDates.error ?? memories.error,
    refresh,
  };
}
