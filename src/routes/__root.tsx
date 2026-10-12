import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useNavigate,
  Navigate,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppShell } from "@/components/layout/app-shell";
import { SuperAdminShell } from "@/components/layout/super-admin-shell";
import { Toaster } from "@/components/ui/sonner";
import { NotificationsListener } from "@/components/NotificationsListener";
import { AppStateProvider } from "@/hooks/use-app-state";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { I18nextProvider } from "react-i18next";
import { Analytics, AnalyticsNoScript } from "@/components/Analytics";
import i18n from "../i18n";

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
      { title: "Sanovia AI — Logiciel médical intelligent pour cabinets et cliniques" },
      {
        name: "description",
        content:
          "Gérez vos rendez-vous, patients, équipe et échanges WhatsApp avec Sanovia AI, une plateforme SaaS médicale sécurisée et assistée par IA.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://sanovia-ai.com/" },
      { property: "og:title", content: "Sanovia AI — Logiciel médical intelligent pour cabinets et cliniques" },
      { property: "og:description", content: "Gérez vos rendez-vous, patients, équipe et échanges WhatsApp avec Sanovia AI, une plateforme SaaS médicale sécurisée et assistée par IA." },
      { property: "og:image", content: "https://sanovia-ai.com/og-image.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Sanovia AI — Logiciel médical intelligent" },
      { name: "twitter:description", content: "Plateforme SaaS médicale sécurisée et assistée par IA." },
      { name: "twitter:image", content: "https://sanovia-ai.com/og-image.jpg" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "preconnect", href: "https://www.googletagmanager.com" },
      { rel: "preconnect", href: "https://connect.facebook.net" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&display=swap" },
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
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Sanovia AI",
    "operatingSystem": "Web",
    "applicationCategory": "HealthApplication",
    "offers": {
      "@type": "Offer",
      "price": "49",
      "priceCurrency": "EUR"
    },
    "description": "Logiciel SaaS de gestion de cabinet médical assisté par IA. Dossiers patients, agenda intelligent, assistant WhatsApp.",
    "url": "https://sanovia-ai.com"
  };

  return (
    <html lang="fr">
      <head>
        <HeadContent />
        <Analytics />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      </head>
      <body>
        <AnalyticsNoScript />
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

    // Manage robots noindex for private pages dynamically
    let meta = document.querySelector('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      document.head.appendChild(meta);
    }
    if (pathname === '/tarifs' || pathname === '/landing' || pathname === '/securite' || pathname === '/assistant-whatsapp' || pathname === '/fonctionnalites' || pathname.startsWith('/solutions/') || pathname === '/' || pathname.startsWith('/fr') || pathname.startsWith('/en') || pathname.startsWith('/ar')) {
       meta.setAttribute('content', 'index, follow');
    } else {
       meta.setAttribute('content', 'noindex');
    }

    // Not authenticated → always go to login or landing
    if (!isAuthenticated && pathname !== "/tarifs" && pathname !== "/login" && pathname !== "/landing" && pathname !== "/securite" && pathname !== "/assistant-whatsapp" && pathname !== "/fonctionnalites" && !pathname.startsWith("/solutions/")) {
      if (pathname === "/") {
        navigate({ to: "/landing" });
      } else {
        navigate({ to: "/login" });
      }
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

  // Not authenticated: show login or landing (no shell)
  if (!isAuthenticated) {
    if (pathname === "/") {
      return <Navigate to="/landing" />;
    }
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
    <>
      <NotificationsListener />
      <AppShell>
        <Outlet />
      </AppShell>
    </>
  );
}

import { AdminProvider } from "@/contexts/admin-context";

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <ThemeProvider>
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AppStateProvider>
              <AdminProvider>
                <AppRouter />
                <Toaster position="top-right" />
              </AdminProvider>
            </AppStateProvider>
          </AuthProvider>
        </QueryClientProvider>
      </I18nextProvider>
    </ThemeProvider>
  );
}
