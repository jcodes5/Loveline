import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import {
  CalendarDays,
  Compass,
  Heart,
  Image,
  LogOut,
  MailPlus,
  Menu,
  MoreHorizontal,
  PenLine,
  X,
} from "lucide-react";

import NotificationSettingsPopover from "@/components/notifications/NotificationSettingsPopover";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useRelationship } from "@/contexts/RelationshipContext";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Home", href: "/", icon: Heart },
  { label: "Discover", href: "/discover", icon: Compass },
  { label: "Memories", href: "/memories", icon: Image },
  { label: "Create", href: "/create", icon: PenLine },
  { label: "More", href: "/more", icon: MoreHorizontal },
];

function NavigationLink({
  item,
  mobile = false,
}: {
  item: (typeof navItems)[number];
  mobile?: boolean;
}) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.href}
      end={item.href === "/"}
      className={({ isActive }) =>
        cn(
          "group inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors",
          mobile
            ? "min-w-0 flex-1 flex-col gap-1 px-1 py-2 text-[11px]"
            : "px-3 py-2 text-sm",
          isActive
            ? "bg-primary-soft text-primary-dark"
            : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            aria-hidden="true"
            className={cn(
              mobile ? "size-5" : "size-4",
              isActive && "stroke-[2.25]",
            )}
          />
          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

export default function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { signOut, user } = useAuth();
  const { relationship } = useRelationship();
  const isOwner = Boolean(user && relationship?.ownerId === user.id);
  const profileInitial =
    user?.user_metadata?.display_name?.slice(0, 1).toUpperCase() ??
    user?.email?.slice(0, 1).toUpperCase() ??
    "L";

  return (
    <div className="page-wash relative min-h-screen overflow-x-clip bg-background text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-primary-soft/20 to-transparent"
      />

      <header className="relative z-30 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="group inline-flex items-center gap-2.5 rounded-full text-foreground"
            aria-label="Loveline home"
          >
            <span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-subtle transition-transform group-hover:scale-105">
              <Heart className="size-[17px] fill-current" aria-hidden="true" />
            </span>
            <span className="font-display text-[25px] font-semibold leading-none tracking-[-0.02em]">
              Loveline
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {navItems.map((item) => (
              <NavigationLink item={item} key={item.href} />
            ))}
          </nav>

          <div className="flex items-center gap-1">
            {isOwner && (
              <>
                <Link
                  to="/admin/messages"
                  className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-primary-dark transition-colors hover:bg-primary-soft"
                  aria-label="Open owner messages"
                >
                  <MailPlus className="size-[17px]" aria-hidden="true" />
                  <span className="hidden lg:inline">Messages</span>
                </Link>
                <Link
                  to="/admin/daily-content"
                  className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-primary-dark transition-colors hover:bg-primary-soft"
                  aria-label="Open daily content"
                >
                  <CalendarDays className="size-[17px]" aria-hidden="true" />
                  <span className="hidden lg:inline">Daily content</span>
                </Link>
              </>
            )}
            <NotificationSettingsPopover />
            <Link
              to="/more"
              className="hidden size-9 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary-dark transition-transform hover:scale-105 sm:grid"
              aria-label="Open your profile and settings"
            >
              {profileInitial}
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="hidden rounded-full text-muted-foreground hover:text-foreground sm:inline-flex"
              aria-label="Sign out"
              onClick={() => void signOut()}
            >
              <LogOut className="size-[17px]" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full md:hidden"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? (
                <X className="size-[19px]" aria-hidden="true" />
              ) : (
                <Menu className="size-[19px]" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-border/70 bg-surface px-4 py-3 md:hidden">
            <nav className="mx-auto flex max-w-6xl flex-col gap-1" aria-label="Mobile menu">
              {navItems.map((item) => (
                <NavigationLink item={item} key={item.href} />
              ))}
            </nav>
          </div>
        )}
      </header>

      <main className="relative z-10 pb-24 md:pb-0">
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-surface/95 px-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_hsl(343_20%_20%_/_0.06)] backdrop-blur-xl md:hidden"
        aria-label="Bottom navigation"
      >
        <div className="mx-auto flex max-w-md items-end justify-between gap-1">
          {navItems.map((item) => (
            <NavigationLink item={item} key={item.href} mobile />
          ))}
        </div>
      </nav>
    </div>
  );
}
