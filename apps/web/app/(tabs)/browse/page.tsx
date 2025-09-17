import { GameFeed } from "./_components/game-feed";
import { fetchInitialGames } from "@/lib/games";

export default async function BrowsePage() {
  const games = await fetchInitialGames();
  return <GameFeed initialGames={games} />;
}
