import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CalendarDays,
  ChevronDown,
  Compass,
  Heart,
  Image,
  LayoutDashboard,
  LogOut,
  MailPlus,
  MessagesSquare,
  MoreHorizontal,
  PenLine,
  Settings2,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

import ThemeToggle from "@/components/layout/ThemeToggle";
import NotificationSettingsPopover from "@/components/notifications/NotificationSettingsPopover";
import PageTransition from "@/components/motion/PageTransition";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useRelationship } from "@/contexts/RelationshipContext";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Home", href: "/", icon: Heart },
  { label: "Discover", href: "/discover", icon: Compass },
  { label: "Messages", href: "/messages", icon: MessagesSquare },
  { label: "Memories", href: "/memories", icon: Image },
  { label: "Create", href: "/create", icon: PenLine },
  { label: "More", href: "/more", icon: MoreHorizontal },
];

const adminItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Messages", href: "/admin/messages", icon: MailPlus },
  { label: "Daily content", href: "/admin/daily-content", icon: CalendarDays },
  { label: "AI workspace", href: "/admin/ai-workspace", icon: Sparkles },
  { label: "Mood mappings", href: "/admin/mood-mappings", icon: SlidersHorizontal },
];

function DesktopLink({ item }: { item: (typeof navItems)[number] }) {
  const Icon = item.icon;

  return (
    <Tooltip delayDuration={250}>
      <TooltipTrigger asChild>
        <NavLink
          to={item.href}
          end={item.href === "/"}
          className={({ isActive }) =>
            cn(
              "group relative inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm font-medium transition-colors lg:px-4",
              isActive
                ? "text-primary-dark"
                : "text-muted-foreground hover:text-foreground",
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.span
                  layoutId="desktop-pill"
                  className="absolute inset-0 rounded-full bg-primary-soft shadow-subtle"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <Icon
                aria-hidden="true"
                className={cn(
                  "relative z-10 size-4 transition-transform duration-200 group-hover:scale-110",
                  isActive && "stroke-[2.25]",
                )}
              />
              <span className="relative z-10 hidden lg:inline">{item.label}</span>
            </>
          )}
        </NavLink>
      </TooltipTrigger>
      <TooltipContent sideOffset={10} className="rounded-full border-border/70 bg-surface px-3 py-1.5 text-xs shadow-card">
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}

function MobileTab({ item }: { item: (typeof navItems)[number] }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.href}
      end={item.href === "/"}
      className={({ isActive }) =>
        cn(
          "relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-1.5 text-[10px] font-semibold transition-colors",
          isActive ? "text-primary-dark" : "text-muted-foreground hover:text-foreground",
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="mobile-tab-pill"
              className="absolute inset-0 rounded-2xl bg-primary-soft"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          <span className="relative z-10">
            <Icon
              aria-hidden="true"
              className={cn(
                "size-[22px] transition-transform duration-200",
                isActive && "scale-110 stroke-[2.25]",
              )}
            />
          </span>
          <span className="relative z-10 truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

function AdminMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-9 gap-1.5 rounded-full px-3 text-sm font-medium text-primary-dark transition-colors hover:bg-primary-soft"
          aria-label="Admin tools"
        >
          <Settings2 className="size-[17px]" aria-hidden="true" />
          <span className="hidden xl:inline">Admin</span>
          <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-2xl border-border/70 bg-surface p-2 shadow-elevated">
        <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Owner tools
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1 bg-border/60" />
        {adminItems.map((item) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem key={item.href} asChild className="rounded-xl px-2 py-2 text-sm focus:bg-primary-soft">
              <Link to={item.href}>
                <Icon className="size-4 text-primary-dark" aria-hidden="true" />
                {item.label}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function AppShell() {
  const { signOut, user } = useAuth();
  const { relationship } = useRelationship();
  const isOwner = Boolean(user && relationship?.ownerId === user.id);
  const [scrolled, setScrolled] = useState(false);
  const profileInitial =
    user?.user_metadata?.display_name?.slice(0, 1).toUpperCase() ??
    user?.email?.slice(0, 1).toUpperCase() ??
    "L";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="page-wash relative min-h-screen overflow-x-clip bg-background text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-primary-soft/20 to-transparent"
      />

      <header
        className={cn(
          "sticky top-0 z-40 border-b transition-all duration-300",
          scrolled
            ? "border-border/80 bg-background/85 shadow-[0_8px_30px_hsl(343_20%_20%_/_0.05)] backdrop-blur-xl"
            : "border-transparent bg-background/60 backdrop-blur-md",
        )}
      >
        <div
          className={cn(
            "mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 transition-[height] duration-300 sm:px-6 lg:px-8",
            scrolled ? "h-14" : "h-16 md:h-[70px]",
          )}
        >
          <Link
            to="/"
            className="group inline-flex items-center gap-2.5 rounded-full text-foreground"
            aria-label="Loveline home"
          >
            <motion.span
              whileHover={{ scale: 1.06, rotate: -4 }}
              whileTap={{ scale: 0.94 }}
              className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-subtle"
            >
              <Heart className="size-[17px] fill-current" aria-hidden="true" />
            </motion.span>
            <span className="font-display text-[25px] font-semibold leading-none tracking-[-0.02em]">
              Loveline
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {navItems.map((item) => (
              <DesktopLink item={item} key={item.href} />
            ))}
          </nav>

          <div className="flex items-center gap-0.5 sm:gap-1">
            {isOwner && (
              <div className="hidden lg:block">
                <AdminMenu />
              </div>
            )}
            <NotificationSettingsPopover />
            <ThemeToggle />
            <Link
              to="/more"
              className="hidden size-9 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary-dark transition-all hover:scale-105 sm:grid"
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
          </div>
        </div>
      </header>

      <main className="relative z-10 pb-32 md:pb-0">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-surface/95 px-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_30px_hsl(343_20%_20%_/_0.06)] backdrop-blur-xl sm:px-3 md:hidden"
        aria-label="Bottom navigation"
      >
        <div className="mx-auto flex max-w-md items-end justify-between gap-0.5">
          {navItems.map((item) => (
            <MobileTab item={item} key={item.href} />
          ))}
        </div>
      </nav>
    </div>
  );
}