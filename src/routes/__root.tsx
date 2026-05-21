import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
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
      { title: "Franzen Team" },
      { name: "description", content: "Consultoria on-line Franzen Team" },
      { name: "author", content: "Franzen Team" },
      { property: "og:title", content: "Franzen Team" },
      { property: "og:description", content: "Consultoria on-line Franzen Team" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "theme-color", content: "#00C4B3" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Franzen Team" },
      { name: "twitter:title", content: "Franzen Team" },
      { name: "twitter:description", content: "Consultoria on-line Franzen Team" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a83db5de-4ef5-43ef-bd79-cb564a254b18/id-preview-ea41e944--d6bd1a8d-09fb-41a6-8ff4-d7fd2cc700de.lovable.app-1778882989027.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a83db5de-4ef5-43ef-bd79-cb564a254b18/id-preview-ea41e944--d6bd1a8d-09fb-41a6-8ff4-d7fd2cc700de.lovable.app-1778882989027.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico?v=2" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png?v=2" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icon-512.png?v=2" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png?v=2" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      router.invalidate();
      queryClient.invalidateQueries();
    });
    return () => subscription.unsubscribe();
  }, [router, queryClient]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // Unregister any previously installed SW (it cached stale chunk hashes).
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister().catch(() => {}));
    }).catch(() => {});
  }, []);

  // Auto-update: detect a new published build and reload all open tabs.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const STORAGE_KEY = "app:build-signature";
    let initialSig: string | null = null;
    let timer: number | null = null;
    let cancelled = false;

    const extractSignature = (html: string) => {
      // Collect all hashed asset URLs referenced by index.html
      // (Vite emits hashed filenames like /_build/assets/index-abcd1234.js)
      const matches = html.match(/[\w./-]+-[A-Za-z0-9_]{8,}\.(?:js|css|mjs)/g);
      if (!matches || matches.length === 0) return null;
      return matches.sort().join("|");
    };

    const reloadEverything = async () => {
      try {
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister().catch(() => {})));
        }
      } catch { /* ignore */ }
      // Add a cache-busting query so the next request bypasses any HTTP cache
      const url = new URL(window.location.href);
      url.searchParams.set("_v", Date.now().toString());
      window.location.replace(url.toString());
    };

    const check = async () => {
      if (cancelled || document.hidden) return;
      try {
        const res = await fetch("/", {
          method: "GET",
          cache: "no-store",
          headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
          credentials: "same-origin",
        });
        if (!res.ok) return;
        const html = await res.text();
        const sig = extractSignature(html);
        if (!sig) return;
        if (initialSig === null) {
          initialSig = sig;
          try { sessionStorage.setItem(STORAGE_KEY, sig); } catch { /* ignore */ }
          return;
        }
        if (sig !== initialSig) {
          // New build detected — force reload across the tab.
          await reloadEverything();
        }
      } catch { /* network hiccup; try again next tick */ }
    };

    // First check immediately, then every 60s, plus on focus/visibility change.
    check();
    timer = window.setInterval(check, 15_000);
    const onVisible = () => { if (!document.hidden) check(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    // Re-check on any navigation (route change) and when network comes back.
    const onNav = () => check();
    window.addEventListener("popstate", onNav);
    window.addEventListener("online", onNav);

    return () => {
      cancelled = true;
      if (timer !== null) window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("popstate", onNav);
      window.removeEventListener("online", onNav);
    };
  }, []);

  // If a hashed asset fails to load (404 after redeploy), force a reload.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onError = (e: ErrorEvent) => {
      const msg = String(e?.message || "");
      if (
        msg.includes("Failed to fetch dynamically imported module") ||
        msg.includes("Importing a module script failed") ||
        msg.includes("error loading dynamically imported module")
      ) {
        const url = new URL(window.location.href);
        url.searchParams.set("_v", Date.now().toString());
        window.location.replace(url.toString());
      }
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", (e) => {
      const reason = (e as PromiseRejectionEvent).reason;
      const msg = String(reason?.message || reason || "");
      if (msg.includes("dynamically imported module") || msg.includes("ChunkLoadError")) {
        const url = new URL(window.location.href);
        url.searchParams.set("_v", Date.now().toString());
        window.location.replace(url.toString());
      }
    });
    return () => window.removeEventListener("error", onError);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster />
    </QueryClientProvider>
  );
}
