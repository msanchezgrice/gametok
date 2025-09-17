// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or service role key for track-session function");
}

interface SessionPayload {
  id: string;
  game_id: string;
  source?: string;
  started_at?: string;
  ended_at?: string | null;
  total_seconds?: number | null;
  completed?: boolean;
  score?: number | null;
  restarts?: number;
  shares?: number;
  heartbeats?: number;
  device_info?: Record<string, unknown>;
}

interface EventPayload {
  event_type: string;
  occurred_at?: string;
  payload?: Record<string, unknown>;
}

interface RequestPayload {
  session: SessionPayload;
  events?: EventPayload[];
}

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
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let payload: RequestPayload;
  try {
    payload = await req.json();
  } catch (error) {
    return new Response(JSON.stringify({ error: "Invalid JSON", detail: String(error) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!payload?.session?.id || !payload.session.game_id) {
    return new Response(
      JSON.stringify({ error: "Session payload must include id and game_id" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: { Authorization: authHeader },
    },
  });

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id ?? null;

  const now = new Date().toISOString();
  const sessionRecord = {
    id: payload.session.id,
    game_id: payload.session.game_id,
    source: payload.session.source ?? "feed",
    started_at: payload.session.started_at ?? now,
    ended_at: payload.session.ended_at ?? null,
    total_seconds: payload.session.total_seconds ?? null,
    completed: payload.session.completed ?? false,
    score: payload.session.score ?? null,
    restarts: payload.session.restarts ?? 0,
    shares: payload.session.shares ?? 0,
    heartbeats: payload.session.heartbeats ?? 0,
    device_info: payload.session.device_info ?? {},
    user_id: userId,
  };

  const { error: sessionError } = await supabase
    .from("game_sessions")
    .upsert(sessionRecord, { onConflict: "id" });

  if (sessionError) {
    console.error("Session upsert failed", sessionError);
    return new Response(JSON.stringify({ error: sessionError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const events = payload.events ?? [];
  if (events.length > 0) {
    const eventRows = events.map((event) => ({
      session_id: payload.session.id,
      event_type: event.event_type,
      occurred_at: event.occurred_at ?? now,
      payload: event.payload ?? {},
    }));

    const { error: eventsError } = await supabase
      .from("session_events")
      .insert(eventRows);

    if (eventsError) {
      console.error("Event insert failed (session_events table may not exist):", eventsError);
      // Don't fail the entire request if events table doesn't exist
      // This allows telemetry to partially work while we set up the table
    }
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
