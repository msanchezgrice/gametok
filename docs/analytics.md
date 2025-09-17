# Analytics & Likability

## Telemetry Events
All gameplay interactions emit analytics events through a shared dispatcher. Critical events:

| Event | Description | Key Properties |
|-------|-------------|----------------|
| `feed_exposed` | Card enters viewport | `game_id`, `position`, `likability_score` |
| `game_start` | Player taps play CTA or autoplay starts | `session_id`, `source`, `genre` |
| `game_pause` | Game pauses (UI or background) | `session_id`, `reason` |
| `game_resume` | Player resumes after pause | `session_id` |
| `game_complete` | Player reaches win condition | `session_id`, `score`, `duration_seconds` |
| `game_fail` | Player loses before completion | `session_id`, `progress` |
| `game_restart` | Restart button pressed | `session_id`, `count` |
| `game_share` | Share sheet opened/sent | `session_id`, `channel` |
| `favorite_toggle` | Favorite/unfavorite | `game_id`, `is_favorite` |

Events are:
1. Captured locally (React Query mutation).
2. Sent to PostHog (`posthog.capture`).
3. Persisted to Supabase via an Edge Function for aggregation and ranking.

## Session Duration Tracking
- The host shell starts a heartbeat timer (`setInterval` + `document.visibilitychange`).
- Heartbeats increment `heartbeats` on the session record every 5 seconds.
- When the game signals `PAUSE`, visibility changes, or the iframe unmounts, the shell finalizes the session with `total_seconds` and completion status.

## Likability Score
The nightly Supabase cron job aggregates 24h metrics and applies genre-aware weights:

Let the base inputs be:
- `CR`: completion rate (`completions / sessions`).
- `AS`: average session seconds (`total_session_seconds / sessions`).
- `RR`: restart-to-completion ratio (`restarts / max(completions, 1)`).
- `SR`: share rate (`shares / sessions`).
- `FR`: favorite rate (`favorites / sessions`).
- `AR`: abandonment rate (`1 - (completions + fails_with_progress) / sessions`).

We normalize each to a 0–1 range via rolling 30-day min/max per genre and compute:

```
Likability = Σ(weight_metric * normalized_metric)
```

### Default Weights
| Genre | CR | AS | RR | SR | FR | AR |
|-------|----|----|----|----|----|----|
| Global baseline | 0.25 | 0.25 | -0.15 | 0.20 | 0.20 | -0.15 |
| Runner | 0.15 | 0.35 | -0.20 | 0.30 | 0.20 | -0.20 |
| Tower Defense | 0.35 | 0.20 | -0.10 | 0.15 | 0.30 | -0.10 |
| Puzzle | 0.30 | 0.20 | -0.10 | 0.20 | 0.30 | -0.10 |
| Arcade/Other | 0.25 | 0.25 | -0.15 | 0.20 | 0.20 | -0.15 |

The cron job blends `global` and genre-specific scores:

```
final_score = (global_score * 0.3) + (genre_score * 0.7)
```

Scores and their component contributions are written to `likability_scores`. The feed service pulls the latest scores to sort and filter the catalog.

## PostHog Dashboard Checklist
- **Acquisition**: Daily new users, install-to-play conversion.
- **Engagement**: Median sessions/user, average plays per user, retention day 1 / day 7.
- **Game Health**: Likability distribution by genre, top movers, drop-off events.
- **Experiments**: Feature flags to test autoplay, share CTA variations, or ranking tweaks.
