"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { createPagesBrowserClient, type SupabaseClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@gametok/types";

const SupabaseContext = createContext<SupabaseClient<Database> | null>(null);

export const useSupabaseBrowser = () => {
  const client = useContext(SupabaseContext);
  if (!client) {
    throw new Error(
      "Supabase client not available. Ensure Providers wraps your component tree and env vars are set.",
    );
  }
  return client;
};

export const useOptionalSupabaseBrowser = () => useContext(SupabaseContext);

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [posthogReady, setPosthogReady] = useState(false);

  const supabaseClient = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Supabase environment variables are missing; client features will be disabled.");
      }
      return null;
    }

    return createPagesBrowserClient<Database>({
      supabaseUrl: url,
      supabaseKey: anonKey,
    });
  }, []);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com";
    if (!key) {
      return;
    }

    posthog.init(key, {
      api_host: host,
      capture_pageview: false,
      persistence: "localStorage+cookie",
      loaded: () => setPosthogReady(true),
    });
  }, []);

  const content = (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return (
    <SupabaseContext.Provider value={supabaseClient}>
      {posthogReady ? (
        <PostHogProvider client={posthog}>{content}</PostHogProvider>
      ) : (
        content
      )}
    </SupabaseContext.Provider>
  );
}
