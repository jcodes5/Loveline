import { ArrowRight, Bell, Check, LoaderCircle, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotificationSettings } from "@/hooks/use-notification-settings";

export default function NotificationSettingsPopover() {
  const { configured, permission, status, error, enable, disable } =
    useNotificationSettings();
  const enabled = status === "enabled";
  const loading = status === "loading";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full text-muted-foreground hover:text-foreground"
          aria-label={enabled ? "Notification settings enabled" : "Notification settings"}
        >
          <Bell className={enabled ? "size-[18px] fill-primary-soft text-primary" : "size-[18px]"} aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(20rem,calc(100vw-2rem))] rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary-dark">
            <Bell className="size-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold tracking-[-0.02em]">
              Gentle reminders
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              We&apos;ll let you know when a new personal note is ready.
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-start gap-2 rounded-xl bg-surface-muted/70 p-3 text-xs leading-5 text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <span>Notifications never include the private words of a message.</span>
        </div>

        {!configured ? (
          <p className="mt-4 text-sm text-muted-foreground" role="status">
            Notifications are being prepared for this Loveline space.
          </p>
        ) : enabled ? (
          <div className="mt-5 space-y-3">
            <p className="flex items-center gap-2 text-sm font-medium text-primary-dark" role="status">
              <Check className="size-4" aria-hidden="true" />
              Notifications are on.
            </p>
            <Button
              variant="outline"
              className="h-10 w-full rounded-full"
              onClick={() => void disable()}
              disabled={loading}
            >
              Pause reminders
            </Button>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {permission === "denied" && (
              <p className="text-sm leading-6 text-muted-foreground" role="status">
                Notifications are blocked. Allow them in your browser settings, then try again.
              </p>
            )}
            {error && permission !== "denied" && (
              <p className="text-sm leading-6 text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button className="h-10 w-full rounded-full" onClick={() => void enable()} disabled={loading}>
              {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
              {loading ? "Turning on reminders…" : "Turn on reminders"}
            </Button>
          </div>
        )}

        <Button asChild variant="ghost" className="mt-4 h-9 w-full justify-between rounded-full px-3 text-primary-dark">
          <Link to="/settings/notifications">
            Manage notification preferences
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </PopoverContent>
    </Popover>
  );
}
