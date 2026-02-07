import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageLoader } from "@/components/PageLoader";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Habits = lazy(() => import("./pages/Habits"));
const Focus = lazy(() => import("./pages/Focus"));
const Insights = lazy(() => import("./pages/Insights"));
const Settings = lazy(() => import("./pages/Settings"));
const Profile = lazy(() => import("./pages/Profile"));
const Journal = lazy(() => import("./pages/Journal"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Activity = lazy(() => import("./pages/Activity"));
const Navigate = lazy(() => import("./pages/Navigate"));
const Notes = lazy(() => import("./pages/Notes"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60 * 1000 },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Suspense fallback={<PageLoader />}><Auth /></Suspense>} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Routes>
                      <Route path="/" element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
                      <Route path="/habits" element={<Suspense fallback={<PageLoader />}><Habits /></Suspense>} />
                      <Route path="/focus" element={<Suspense fallback={<PageLoader />}><Focus /></Suspense>} />
                      <Route path="/journal" element={<Suspense fallback={<PageLoader />}><Journal /></Suspense>} />
                      <Route path="/calendar" element={<Suspense fallback={<PageLoader />}><Calendar /></Suspense>} />
                      <Route path="/activity" element={<Suspense fallback={<PageLoader />}><Activity /></Suspense>} />
                      <Route path="/navigate" element={<Suspense fallback={<PageLoader />}><Navigate /></Suspense>} />
                      <Route path="/notes" element={<Suspense fallback={<PageLoader />}><Notes /></Suspense>} />
                      <Route path="/insights" element={<Suspense fallback={<PageLoader />}><Insights /></Suspense>} />
                      <Route path="/profile" element={<Suspense fallback={<PageLoader />}><Profile /></Suspense>} />
                      <Route path="/settings" element={<Suspense fallback={<PageLoader />}><Settings /></Suspense>} />
                      <Route path="*" element={<Suspense fallback={<PageLoader />}><NotFound /></Suspense>} />
                    </Routes>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;