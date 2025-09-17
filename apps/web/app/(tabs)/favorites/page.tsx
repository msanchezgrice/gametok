"use client";

import { useEffect, useState } from "react";
import { useOptionalSupabaseBrowser } from "@/app/providers";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { fetchFavoriteGames } from "@/lib/favorites";

export default function FavoritesPage() {
  const supabase = useOptionalSupabaseBrowser();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setUserId(null);
      return;
    }

    supabase.auth
      .getUser()
      .then(({ data }) => setUserId(data?.user?.id ?? null))
      .catch(() => setUserId(null));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => listener?.subscription.unsubscribe();
  }, [supabase]);

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ["favorites", userId],
    queryFn: async () => {
      if (!supabase || !userId) return [];
      return fetchFavoriteGames(supabase, userId);
    },
    enabled: Boolean(supabase && userId),
  });

  const hasEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

  if (!hasEnv) {
    return (
      <section className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-white/70">
        <h1 className="text-xl font-semibold text-white">Favorites</h1>
        <p>Configure Supabase environment variables to enable synced favorites.</p>
      </section>
    );
  }

  if (!supabase) {
    return (
      <section className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-white/70">
        <h1 className="text-xl font-semibold text-white">Favorites</h1>
        <p>Supabase client unavailable. Check providers configuration.</p>
      </section>
    );
  }

  if (!userId) {
    return (
      <section className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-white/70">
        <h1 className="text-xl font-semibold text-white">Favorites</h1>
        <p>Sign in from the Settings tab to save favorites across devices.</p>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-white/70">
        <h1 className="text-xl font-semibold text-white">Favorites</h1>
        <p>Loading your saved games…</p>
      </section>
    );
  }

  if (favorites.length === 0) {
    return (
      <section className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-white/70">
        <h1 className="text-xl font-semibold text-white">Favorites</h1>
        <p>Star a game from the feed to pin it here.</p>
      </section>
    );
  }

  return (
    <section className="flex h-full flex-col gap-4 overflow-y-auto px-6 py-8">
      <header>
        <h1 className="text-xl font-semibold">Favorites</h1>
        <p className="mt-1 text-sm text-white/70">Jump back into the games you love most.</p>
      </header>

      <ul className="space-y-4">
        {favorites.map((game) => (
          <li key={game.id} className="rounded-3xl border border-white/10 bg-[color:var(--surface)]/60 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">{game.genre}</p>
                <h2 className="text-lg font-semibold text-white">{game.title}</h2>
                <p className="mt-1 text-sm text-white/70">{game.shortDescription}</p>
              </div>
              <Link
                href="/browse"
                className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white"
              >
                Play
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
