import { type GameList } from '@retroachievements/api';
import { type GamesHashMap } from '@/types/games';
import gameDb from '@/data/ra/all-games.json';

let hashDatabase: GamesHashMap | null = null;

export type GameEntity = GameList[number];

export async function loadHashDatabase(): Promise<GamesHashMap> {
  if (hashDatabase) return hashDatabase;

  hashDatabase = gameDb as GamesHashMap;

  return hashDatabase;
}

export async function lookupRomByHash(hash: string): Promise<GameEntity | null> {
  const gameDb = await loadHashDatabase();
  const gameIndex = gameDb.hashMap[hash];
  const game = gameDb.games[gameIndex];

  return game || null;
}

export function lookupRomByHashSync(hash: string): GameEntity | null {
  if (!hashDatabase) {
    throw new Error('Hash database not loaded. Call loadHashDatabase() first.');
  }

  const gameIndex = hashDatabase.hashMap[hash];
  const game = hashDatabase.games[gameIndex];

  return game || null;
}

export function unloadHashDatabase(): void {
  hashDatabase = null; // Allow GC to reclaim memory
}
