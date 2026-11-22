import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { DEMO_PATH } from '@/data/demo/demoMode';
import type { Backend } from '@/data/ports';
import { AuthActionPage } from '@/features/auth/AuthActionPage';
import { LoginPage, ResetPasswordPage, SignupPage, UpdatePasswordPage } from '@/features/auth/AuthPages';
import { HabitDetailPage } from '@/features/habits/HabitDetailPage';
import { HabitsPage } from '@/features/habits/HabitsPage';
import { LegalPage, NotFoundPage } from '@/features/legal/LegalPage';
import { OnboardingPage } from '@/features/onboarding/OnboardingPage';
import { ProgressPage } from '@/features/progress/ProgressPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { TasksPage } from '@/features/tasks/TasksPage';
import { TodayPage } from '@/features/today/TodayPage';
import { BackendProvider } from '@/state/session';
import { ThemeProvider } from '@/ui/theme';
import { ToastProvider } from '@/ui/Toast';
import { AppShell } from './shell/AppShell';
import { FirstRunGate, RequireAuth } from './shell/RequireAuth';
import { ScrollToTop } from './shell/ScrollToTop';

export function App({ backend }: { backend: Backend }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error, query) => console.error(`[Ledger] Couldn’t load ${String(query.queryKey[2] ?? query.queryKey[0])}:`, error),
        }),
        // 'always': the data layer handles being offline itself (Firestore's on-device copy),
        // so React Query mustn't pause loading and saving while there's no connection.
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, networkMode: 'always' },
          mutations: { networkMode: 'always' },
        },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <BackendProvider backend={backend}>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <ScrollToTop />
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/update-password" element={<UpdatePasswordPage />} />
                <Route path="/auth/action" element={<AuthActionPage />} />
                <Route path="/privacy" element={<LegalPage kind="privacy" />} />
                <Route path="/terms" element={<LegalPage kind="terms" />} />
                {/* main.tsx has already switched this tab to the sample-data demo; start on Today. */}
                <Route path={DEMO_PATH} element={<Navigate to="/" replace />} />
                <Route path="/welcome" element={<RequireAuth><OnboardingPage /></RequireAuth>} />
                <Route element={<RequireAuth><FirstRunGate><AppShell /></FirstRunGate></RequireAuth>}>
                  <Route index element={<TodayPage />} />
                  <Route path="tasks" element={<TasksPage />} />
                  <Route path="progress" element={<ProgressPage />} />
                  <Route path="habits" element={<HabitsPage />} />
                  <Route path="habits/:id" element={<HabitDetailPage />} />
                  <Route path="settings/:tab?" element={<SettingsPage />} />
                </Route>
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </BrowserRouter>
          </BackendProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
