import { useEffect, useState } from "react";

import { getTimeGreeting } from "@/lib/time-greeting";

export function useTimeGreeting() {
  const [greeting, setGreeting] = useState(() => getTimeGreeting());

  useEffect(() => {
    const timer = window.setInterval(() => setGreeting(getTimeGreeting()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return greeting;
}
