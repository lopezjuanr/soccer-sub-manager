/**
 * Soccer Sub Manager — Core Game Engine
 * Design: Clean Coach's App — near-black + electric lime, urgency-coded player cards
 *
 * Game rules:
 * - 5–7 players on roster
 * - 4 players on field at a time
 * - Each player must play at least half the total game time
 * - 3 substitution windows: mid-first-half, halftime, mid-second-half
 * - Game is split into 2 halves; each half has a mid-point sub window
 */

export type PlayerStatus = "on" | "off";

export interface Player {
  id: string;
  name: string;
  /** Total minutes played so far */
  minutesPlayed: number;
  /** Whether currently on the field */
  status: PlayerStatus;
  /** When they last went on the field (game-clock minutes) */
  lastOnAt: number | null;
}

export type SubWindow = "mid-first" | "halftime" | "mid-second";

export interface SubRecommendation {
  playerOut: Player;
  playerIn: Player;
  reason: string;
}

export interface GameSettings {
  /** Total game duration in minutes (e.g. 40 for 2×20) */
  totalMinutes: number;
  /** Number of players on field at once */
  fieldSize: number;
}

export const DEFAULT_SETTINGS: GameSettings = {
  totalMinutes: 40,
  fieldSize: 4,
};

/**
 * The 3 substitution windows as fractions of total game time.
 * mid-first  = 25% through game
 * halftime   = 50%
 * mid-second = 75%
 */
export const SUB_WINDOWS: { id: SubWindow; label: string; fraction: number }[] =
  [
    { id: "mid-first", label: "Mid 1st Half", fraction: 0.25 },
    { id: "halftime", label: "Halftime", fraction: 0.5 },
    { id: "mid-second", label: "Mid 2nd Half", fraction: 0.75 },
  ];

/**
 * Given the current game clock (minutes elapsed) and total minutes,
 * return which sub window is currently active (within ±2 min), or null.
 */
export function getActiveSubWindow(
  elapsed: number,
  totalMinutes: number
): SubWindow | null {
  for (const w of SUB_WINDOWS) {
    const target = w.fraction * totalMinutes;
    if (Math.abs(elapsed - target) <= 2) return w.id;
  }
  return null;
}

/**
 * Compute how many minutes each player still needs to satisfy the
 * "play at least half the game" requirement.
 */
export function minutesStillNeeded(
  player: Player,
  settings: GameSettings
): number {
  const required = settings.totalMinutes / 2;
  return Math.max(0, required - player.minutesPlayed);
}

/**
 * Compute how many minutes remain in the game from the current elapsed time.
 */
export function minutesRemaining(
  elapsed: number,
  settings: GameSettings
): number {
  return Math.max(0, settings.totalMinutes - elapsed);
}

/**
 * Core substitution recommendation engine.
 *
 * Strategy:
 * 1. Identify bench players who still NEED time (haven't hit half-game yet).
 * 2. Identify field players who have ALREADY met their minimum, sorted by most time played.
 * 3. Pair them up: most-needy bench → most-rested field player.
 * 4. Cap at the number of available bench players who need time.
 *
 * Returns an array of recommended swaps.
 */
export function computeRecommendations(
  players: Player[],
  elapsed: number,
  settings: GameSettings
): SubRecommendation[] {
  const remaining = minutesRemaining(elapsed, settings);
  const halfGame = settings.totalMinutes / 2;

  // Snapshot current played time (add time since last went on for on-field players)
  const withCurrent = players.map((p) => {
    const currentMinutes =
      p.status === "on" && p.lastOnAt !== null
        ? p.minutesPlayed + (elapsed - p.lastOnAt)
        : p.minutesPlayed;
    return { ...p, currentMinutes };
  });

  const bench = withCurrent
    .filter((p) => p.status === "off")
    .sort((a, b) => a.currentMinutes - b.currentMinutes); // least time first

  const field = withCurrent
    .filter((p) => p.status === "on")
    .sort((a, b) => b.currentMinutes - a.currentMinutes); // most time first

  const recs: SubRecommendation[] = [];

  // Only recommend subs for bench players who won't hit half-game without playing
  const needyBench = bench.filter((p) => {
    const needed = halfGame - p.currentMinutes;
    return needed > 0;
  });

  // Field players who have already met their minimum (safe to pull)
  const safeToSub = field.filter((p) => p.currentMinutes >= halfGame);

  const count = Math.min(needyBench.length, safeToSub.length);

  for (let i = 0; i < count; i++) {
    const playerIn = needyBench[i];
    const playerOut = safeToSub[i];
    const needed = Math.ceil(halfGame - playerIn.currentMinutes);
    recs.push({
      playerOut: players.find((p) => p.id === playerOut.id)!,
      playerIn: players.find((p) => p.id === playerIn.id)!,
      reason: `${playerIn.name} needs ~${needed} more min to reach half-game`,
    });
  }

  // If no "safe" field players, still recommend swapping the player with most time
  // for the bench player with least time (best-effort)
  if (recs.length === 0 && needyBench.length > 0 && field.length > 0) {
    const playerIn = needyBench[0];
    const playerOut = field[0];
    const needed = Math.ceil(halfGame - playerIn.currentMinutes);
    recs.push({
      playerOut: players.find((p) => p.id === playerOut.id)!,
      playerIn: players.find((p) => p.id === playerIn.id)!,
      reason: `${playerIn.name} needs ~${needed} more min — swap with most-played`,
    });
  }

  return recs;
}

/**
 * Urgency level for a player based on minutes played vs required.
 * "ok"      = already met minimum
 * "caution" = within 5 min of meeting minimum but not yet
 * "urgent"  = more than 5 min short
 */
export function playerUrgency(
  player: Player,
  elapsed: number,
  settings: GameSettings
): "ok" | "caution" | "urgent" {
  const halfGame = settings.totalMinutes / 2;
  const currentMinutes =
    player.status === "on" && player.lastOnAt !== null
      ? player.minutesPlayed + (elapsed - player.lastOnAt)
      : player.minutesPlayed;

  const shortfall = halfGame - currentMinutes;
  if (shortfall <= 0) return "ok";
  if (shortfall <= 5) return "caution";
  return "urgent";
}

/**
 * Get current effective minutes played for a player (including current stint if on field).
 */
export function effectiveMinutes(player: Player, elapsed: number): number {
  if (player.status === "on" && player.lastOnAt !== null) {
    return player.minutesPlayed + (elapsed - player.lastOnAt);
  }
  return player.minutesPlayed;
}
