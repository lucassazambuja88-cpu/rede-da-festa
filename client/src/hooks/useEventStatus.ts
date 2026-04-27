import { useMemo } from "react";
import { EventItem } from "@/types";

export function useEventStatus(event?: EventItem | null) {
  return useMemo(() => {
    if (!event) {
      return {
        hasStarted: false,
        hasEnded: false,
        isLive: false,
      };
    }

    const now = Date.now();
    const start = new Date(event.startsAt).getTime();
    const end = new Date(event.endsAt).getTime();

    return {
      hasStarted: now >= start,
      hasEnded: now > end || !event.isActive,
      isLive: now >= start && now <= end && event.isActive,
    };
  }, [event]);
}

