// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE");

if (!SUPABASE_URL || !SERVICE_ROLE) {
  throw new Error("Missing SUPABASE_URL or service role key");
}

const WEIGHTS: Record<string, Record<string, number>> = {
  global: {
    completionRate: 0.25,
    averageSessionSeconds: 0.25,
    restartToCompleteRatio: -0.15,
    shareRate: 0.2,
    favoriteRate: 0.2,
    abandonmentRate: -0.15,
  },
  runner: {
    completionRate: 0.15,
    averageSessionSeconds: 0.35,
    restartToCompleteRatio: -0.2,
    shareRate: 0.3,
    favoriteRate: 0.2,
    abandonmentRate: -0.2,
  },
  tower_defense: {
    completionRate: 0.35,
    averageSessionSeconds: 0.2,
    restartToCompleteRatio: -0.1,
    shareRate: 0.15,
    favoriteRate: 0.3,
    abandonmentRate: -0.1,
  },
  puzzle: {
    completionRate: 0.3,
    averageSessionSeconds: 0.2,
    restartToCompleteRatio: -0.1,
    shareRate: 0.2,
    favoriteRate: 0.3,
    abandonmentRate: -0.1,
  },
  arcade: {
    completionRate: 0.25,
    averageSessionSeconds: 0.25,
    restartToCompleteRatio: -0.15,
    shareRate: 0.2,
    favoriteRate: 0.2,
    abandonmentRate: -0.15,
  },
};

const safeDivide = (numerator: number, denominator: number) =>
  denominator === 0 ? 0 : numerator / denominator;

const normalise = (value: number, min: number, max: number) => {
  if (max === min) return 0;
  return (value - min) / (max - min);
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: rollupData, error: rollupError } = await supabase
    .from("game_engagement_rollup")
    .select("game_id, genre, sessions, completions, total_seconds, restarts, shares, abandons, favorites");

  if (rollupError) {
    console.error("Failed to load engagement rollup", rollupError);
    return new Response(JSON.stringify({ error: rollupError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!rollupData || rollupData.length === 0) {
    return new Response(JSON.stringify({ message: "No engagement data yet" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const metrics = rollupData.map((row) => {
    const completionRate = safeDivide(row.completions, row.sessions);
    const averageSessionSeconds = safeDivide(row.total_seconds, row.sessions);
    const restartToCompleteRatio = safeDivide(row.restarts, row.completions || 1);
    const shareRate = safeDivide(row.shares, row.sessions);
    const favoriteRate = safeDivide(row.favorites ?? 0, row.sessions);
    const abandonmentRate = safeDivide(row.abandons, row.sessions);

    return {
      game_id: row.game_id,
      genre: row.genre,
      sessions: row.sessions,
      stats: {
        completionRate,
        averageSessionSeconds,
        restartToCompleteRatio,
        shareRate,
        favoriteRate,
        abandonmentRate,
      },
    };
  });

  const globalStats = metrics.reduce(
    (acc, item) => {
      for (const key of Object.keys(item.stats) as (keyof typeof item.stats)[]) {
        acc[key].push(item.stats[key]);
      }
      return acc;
    },
    {
      completionRate: [] as number[],
      averageSessionSeconds: [] as number[],
      restartToCompleteRatio: [] as number[],
      shareRate: [] as number[],
      favoriteRate: [] as number[],
      abandonmentRate: [] as number[],
    },
  );

  const ranges = Object.fromEntries(
    Object.entries(globalStats).map(([key, values]) => [key, {
      min: Math.min(...values, 0),
      max: Math.max(...values, 0),
    }]),
  ) as Record<string, { min: number; max: number }>;

  const rowsToInsert = [] as any[];

  for (const metric of metrics) {
    const genreWeights = WEIGHTS[metric.genre] ?? WEIGHTS.arcade ?? WEIGHTS.global;
    const components = [] as any[];
    let totalScore = 0;

    for (const [metricKey, weight] of Object.entries(WEIGHTS.global)) {
      const value = metric.stats[metricKey as keyof typeof metric.stats] ?? 0;
      const { min, max } = ranges[metricKey] ?? { min: 0, max: 1 };
      const normalized = normalise(value, min, max);
      const genreWeight = genreWeights[metricKey] ?? weight;
      const weighted = normalized * genreWeight;
      totalScore += weighted;
      components.push({
        key: metricKey,
        label: metricKey,
        weight: genreWeight,
        observedValue: value,
        normalizedValue: normalized,
      });
    }

    rowsToInsert.push({
      game_id: metric.game_id,
      genre: metric.genre,
      score: totalScore,
      components,
      sample_size: metric.sessions,
      computed_at: new Date().toISOString(),
    });
  }

  // First, delete existing scores for these games
  const gameIds = rowsToInsert.map(row => row.game_id);
  await supabase
    .from("likability_scores")
    .delete()
    .in("game_id", gameIds);

  // Then insert the new scores
  const { error: insertError } = await supabase
    .from("likability_scores")
    .insert(rowsToInsert);

  if (insertError) {
    console.error("Failed to upsert likability scores", insertError);
    return new Response(JSON.stringify({ error: insertError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { error: jobError } = await supabase
    .from("likability_jobs")
    .insert({ status: "completed", details: { rows: rowsToInsert.length } });

  if (jobError) {
    console.warn("Failed to log likability job", jobError);
  }

  return new Response(JSON.stringify({ success: true, rows: rowsToInsert.length }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
