import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import "@/global.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AuthBoundary, OwnerBoundary, RelationshipBoundary } from "@/components/auth/AuthBoundary";
import AppShell from "@/components/layout/AppShell";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { RelationshipProvider } from "@/contexts/RelationshipContext";
import { registerServiceWorker } from "@/lib/register-service-worker";
import { listenForForegroundNotifications } from "@/lib/firebase-messaging";
import { toast } from "sonner";
import Auth from "@/pages/Auth";
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const AIWorkspace = lazy(() => import("@/pages/AIWorkspace"));
const Create = lazy(() => import("@/pages/Create"));
const DailyContentWorkspace = lazy(() => import("@/pages/DailyContentWorkspace"));
const Discover = lazy(() => import("@/pages/Discover"));
const Index = lazy(() => import("@/pages/Index"));
const Memories = lazy(() => import("@/pages/Memories"));
const MessageWorkspace = lazy(() => import("@/pages/MessageWorkspace"));
const MoodHistory = lazy(() => import("@/pages/MoodHistory"));
const More = lazy(() => import("@/pages/More"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Timeline = lazy(() => import("@/pages/Timeline"));
const NotificationPreferences = lazy(() => import("@/pages/NotificationPreferences"));
const RelationshipSetup = lazy(() => import("@/pages/RelationshipSetup"));

const queryClient = new QueryClient();

function ForegroundNotificationListener() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    let unsubscribe: (() => void) | undefined;
    listenForForegroundNotifications(() => {
      toast.info("A little note from Loveline", {
        description: "Your person left something for you.",
        action: {
          label: "Open",
          onClick: () => { window.location.href = "/"; },
        },
      });
    }).then((fn) => { unsubscribe = fn; });
    return () => { unsubscribe?.(); };
  }, [user]);
  return null;
}

function RouteFallback() {
  return <div className="grid min-h-[50vh] place-items-center px-6 text-sm text-muted-foreground" role="status">Opening Loveline…</div>;
}
registerServiceWorker();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <RelationshipProvider>
          <ForegroundNotificationListener />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route element={<AuthBoundary />}>
                <Route path="/setup" element={<RelationshipSetup />} />
                <Route element={<RelationshipBoundary />}>
                  <Route element={<AppShell />}>
                    <Route element={<OwnerBoundary />}>
                      <Route path="/admin" element={<AdminDashboard />} />
                      <Route path="/admin/ai-workspace" element={<AIWorkspace />} />
                      <Route path="/admin/messages" element={<MessageWorkspace />} />
                      <Route path="/admin/daily-content" element={<DailyContentWorkspace />} />
                    </Route>
                    <Route path="/" element={<Index />} />
                    <Route path="/discover" element={<Discover />} />
                    <Route path="/memories" element={<Memories />} />
                    <Route path="/create" element={<Create />} />
                    <Route path="/settings/notifications" element={<NotificationPreferences />} />
                    <Route path="/more" element={<More />} />
                    <Route path="/timeline" element={<Timeline />} />
                    <Route path="/mood-history" element={<MoodHistory />} />
                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Route>
              </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </RelationshipProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

const rootElement = document.getElementById("root")!;
const root =
  (window as Window & { __lovelineRoot?: Root }).__lovelineRoot ??
  createRoot(rootElement);

(window as Window & { __lovelineRoot?: Root }).__lovelineRoot = root;
root.render(<App />);
