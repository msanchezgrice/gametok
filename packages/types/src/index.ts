export type GameGenre =
  | "runner"
  | "tower_defense"
  | "puzzle"
  | "platformer"
  | "shooter"
  | "arcade"
  | "logic"
  | "other";

export interface GameDefinition {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  genre: GameGenre;
  playInstructions: string;
  estimatedDurationSeconds: number;
  assetBundleUrl: string;
  thumbnailUrl: string;
  tags: string[];
  status: "draft" | "published" | "archived";
  createdAt: string;
  updatedAt: string;
  runtimeVersion: string;
}

export interface GameVariant {
  gameId: string;
  variantId: string;
  entryHtmlPath: string;
  buildHash: string;
  buildSizeKb: number;
  orientation: "portrait" | "landscape" | "responsive";
  minAppVersion: string;
}

export interface SessionMetric {
  metric: string;
  value: number;
}

export interface GameSession {
  id: string;
  gameId: string;
  userId: string | null;
  startedAt: string;
  endedAt: string | null;
  totalSeconds: number | null;
  score: number | null;
  completed: boolean;
  restarts: number;
  shares: number;
  heartbeats: number;
  customMetrics: SessionMetric[];
  source: "feed" | "share" | "favorites";
  deviceInfo: Record<string, string | number | boolean>;
}

export interface LikabilityComponent {
  key: string;
  label: string;
  weight: number;
  genre: GameGenre | "global";
  observedValue: number;
  normalizedValue: number;
}

export interface LikabilityScore {
  gameId: string;
  genre: GameGenre;
  score: number;
  components: LikabilityComponent[];
  computedAt: string;
  sampleSize: number;
}

export interface PosthogEventPayload {
  sessionId: string;
  gameId: string;
  event: string;
  timestamp: string;
  properties?: Record<string, unknown>;
}

export interface BaseLikabilityInputs {
  completionRate: number;
  averageSessionSeconds: number;
  restartToCompleteRatio: number;
  shareRate: number;
  favoriteRate: number;
  abandonmentRate: number;
}

export type LikabilityWeights = Record<
  GameGenre | "global",
  Partial<Record<keyof BaseLikabilityInputs, number>>
>;

export type Database = {
  public: {
    Tables: {
      games: {
        Row: {
          id: string;
          slug: string;
          title: string;
          short_description: string;
          genre: string;
          play_instructions: string;
          estimated_duration_seconds: number;
          runtime_version: string;
          status: string;
          tags: string[];
          thumbnail_url: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["games"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["games"]["Row"]>;
      };
      favorites: {
        Row: {
          id: number;
          user_id: string;
          game_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          game_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["favorites"]["Row"]>;
      };
      game_sessions: {
        Row: {
          id: string;
          game_id: string | null;
          user_id: string | null;
          source: string;
          started_at: string;
          ended_at: string | null;
          total_seconds: number | null;
          completed: boolean;
          score: string | null;
          restarts: number;
          shares: number;
          heartbeats: number;
          device_info: Record<string, unknown>;
        };
        Insert: Partial<Database["public"]["Tables"]["game_sessions"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["game_sessions"]["Row"]>;
      };
      likability_scores: {
        Row: {
          id: number;
          game_id: string;
          genre: string;
          score: string;
          components: Record<string, unknown>;
          sample_size: number;
          computed_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["likability_scores"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["likability_scores"]["Row"]>;
      };
    };
    Views: {
      game_engagement_summary: {
        Row: {
          game_id: string;
          event_day: string;
          sessions: number;
          completions: number;
          total_seconds: string | null;
          total_restarts: string | null;
          total_shares: string | null;
        };
      };
    };
  };
};
