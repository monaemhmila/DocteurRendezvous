import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppShell } from "@/components/layout/app-shell";
import { SuperAdminShell } from "@/components/layout/super-admin-shell";
import { Toaster } from "@/components/ui/sonner";
import { AppStateProvider } from "@/hooks/use-app-state";
import { AuthProvider, useAuth } from "@/contexts/auth-context";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page introuvable</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La page que vous cherchez n'existe pas ou a été déplacée.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Cette page n'a pas pu se charger
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Une erreur s'est produite. Vous pouvez réessayer ou retourner à l'accueil.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Réessayer
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Retour à l'accueil
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Medical AI — Récupération patients" },
      {
        name: "description",
        content:
          "Plateforme IA pour cabinets médicaux : récupération patients, agenda, conversations WhatsApp et analytics.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AppRouter() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const navigate = useNavigate();
  const pathname = router.state.location.pathname;

  useEffect(() => {
    if (isLoading) return;

    // Not authenticated → always go to login
    if (!isAuthenticated && pathname !== "/login") {
      navigate({ to: "/login" });
      return;
    }

    // Authenticated on login page → redirect to correct home
    if (isAuthenticated && pathname === "/login") {
      navigate({ to: user?.role === "super_admin" ? "/super-admin" : "/" });
      return;
    }

    // Clinic user trying to access super-admin area → back to dashboard
    if (isAuthenticated && user?.role !== "super_admin" && pathname.startsWith("/super-admin")) {
      navigate({ to: "/" });
      return;
    }

    // Super admin trying to access clinic area → back to their dashboard
    if (isAuthenticated && user?.role === "super_admin" && !pathname.startsWith("/super-admin") && pathname !== "/login") {
      navigate({ to: "/super-admin" });
      return;
    }
  }, [isAuthenticated, isLoading, pathname, user]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          <p className="text-sm text-muted-foreground">Chargement…</p>
        </div>
      </div>
    );
  }

  // Not authenticated: show login (no shell)
  if (!isAuthenticated) {
    return <Outlet />;
  }

  // Super admin: dedicated shell
  if (user?.role === "super_admin") {
    return (
      <SuperAdminShell>
        <Outlet />
      </SuperAdminShell>
    );
  }

  // Clinic / cabinet staff: full app shell
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppStateProvider>
          <AppRouter />
          <Toaster position="top-right" />
        </AppStateProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
