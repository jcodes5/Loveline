import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const dark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full text-muted-foreground hover:text-foreground"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {mounted ? (
        dark ? (
          <Sun className="size-[18px]" aria-hidden="true" />
        ) : (
          <Moon className="size-[18px]" aria-hidden="true" />
        )
      ) : (
        <span className="size-[18px] rounded-full bg-surface-muted" aria-hidden="true" />
      )}
    </Button>
  );
}