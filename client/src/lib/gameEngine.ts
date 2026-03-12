/**
 * Soccer Sub Manager — Core Game Engine
 * Design: Clean Coach's App — near-black + electric lime, urgency-coded player cards
 *
 * Game rules:
 * - 5–7 players on roster
 * - 4 players on field at a time
 * - Each player must play at least half the total game time (≥20 min in a 40-min game)
 * - NEW: Every player must play in BOTH the first half AND the second half
 * - 3 substitution windows: mid-first-half (10 min), halftime (20 min), mid-second-half (30 min)
 *
 * Half definitions (40-min game):
 *   First half:  0:00 – 20:00
 *   Second half: 20:00 – 40:00
 *   Mid-1st:     10:00  ← last chance to get bench players 1st-half time
 *   Halftime:    20:00  ← hard deadline: any player with 0 first-half min MUST come on
 *   Mid-2nd:     30:00  ← balance remaining time
 */

export type PlayerStatus = "on" | "off";

export interface Player {
  id: string;
  name: string;
  /** Total minutes played so far (committed — not including current stint) */
  minutesPlayed: number;
  /** Whether currently on the field */
  status: PlayerStatus;
  /** Game-clock minute when they last went on the field */
  lastOnAt: number | null;
  /** Minutes played in the first half (committed) */
  firstHalfMinutes: number;
  /** Minutes played in the second half (committed) */
  secondHalfMinutes: number;
}

export type SubWindow = "mid-first" | "halftime" | "mid-second";

export interface SubRecommendation {
  playerOut: Player;
  playerIn: Player;
  reason: string;
}

export interface GameSettings {
  /** Total game duration in minutes (40) */
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
 */
export const SUB_WINDOWS: { id: SubWindow; label: string; fraction: number }[] =
  [
    { id: "mid-first", label: "Mid 1st Half", fraction: 0.25 },
    { id: "halftime", label: "Halftime", fraction: 0.5 },
    { id: "mid-second", label: "Mid 2nd Half", fraction: 0.75 },
  ];

/** Which half a given elapsed-minute value falls in (1 or 2). */
export function currentHalf(elapsed: number, settings: GameSettings): 1 | 2 {
  return elapsed < settings.totalMinutes / 2 ? 1 : 2;
}

/**
 * Compute a player's effective minutes in each half at a given elapsed time.
 * This accounts for the current active stint if the player is on the field.
 */
export function effectiveHalfMinutes(
  player: Player,
  elapsed: number,
  settings: GameSettings
): { first: number; second: number; total: number } {
  const halfPoint = settings.totalMinutes / 2;

  let first = player.firstHalfMinutes;
  let second = player.secondHalfMinutes;

  if (player.status === "on" && player.lastOnAt !== null) {
    const stintStart = player.lastOnAt;
    const stintEnd = elapsed;

    // How much of this stint falls in the first half?
    const firstHalfEnd = Math.min(stintEnd, halfPoint);
    const firstHalfStart = Math.min(stintStart, halfPoint);
    first += Math.max(0, firstHalfEnd - firstHalfStart);

    // How much falls in the second half?
    const secondHalfStart = Math.max(stintStart, halfPoint);
    const secondHalfEnd = Math.max(stintEnd, halfPoint);
    second += Math.max(0, secondHalfEnd - secondHalfStart);
  }

  return { first, second, total: first + second };
}

/**
 * Simpler helper: total effective minutes played (including current stint).
 */
export function effectiveMinutes(player: Player, elapsed: number): number {
  if (player.status === "on" && player.lastOnAt !== null) {
    return player.minutesPlayed + (elapsed - player.lastOnAt);
  }
  return player.minutesPlayed;
}

/**
 * Compute how many minutes remain in the game.
 */
export function minutesRemaining(
  elapsed: number,
  settings: GameSettings
): number {
  return Math.max(0, settings.totalMinutes - elapsed);
}

/**
 * Urgency level for a player.
 *
 * Priority order:
 * 1. "critical" — player has NOT played in a half that is now over (missed a half entirely).
 *    This is a rule violation — shown as a flashing red border.
 * 2. "urgent" — player has NOT played in the current half and there is ≤1 sub window left
 *    in this half to fix it. Must act NOW.
 * 3. "caution" — player has NOT played in the current half but there is still a sub window
 *    coming in this half where they can be brought on.
 * 4. "low-time" — player has played in both halves but is still short of the 20-min minimum
 *    and time is running out.
 * 5. "ok" — player has played in both halves and met (or is on track for) the minimum.
 */
export type UrgencyLevel = "critical" | "urgent" | "caution" | "low-time" | "ok";

export function playerUrgency(
  player: Player,
  elapsed: number,
  settings: GameSettings,
  completedWindows: SubWindow[]
): UrgencyLevel {
  const halfPoint = settings.totalMinutes / 2;
  const { first, second, total } = effectiveHalfMinutes(player, elapsed, settings);
  const half = currentHalf(elapsed, settings);

  // ── Critical: missed an entire half ──────────────────────────────────────
  // First half is "over" once we're past halftime
  if (elapsed >= halfPoint && first === 0) return "critical";
  // Second half is "over" once the game ends (handled at END_GAME), but flag
  // late in the game if they haven't played yet
  if (elapsed >= halfPoint && second === 0 && elapsed >= settings.totalMinutes * 0.9) {
    return "critical";
  }

  // ── Urgent: hasn't played in current half, running out of windows ────────
  const hasPlayedThisHalf = half === 1 ? first > 0 : second > 0;

  if (!hasPlayedThisHalf) {
    // How many sub windows are left in the current half?
    const windowsLeftInHalf = half === 1
      ? (completedWindows.includes("mid-first") ? 0 : 1) // halftime is the boundary, not a 1st-half window
      : (completedWindows.includes("mid-second") ? 0 : 1);

    if (windowsLeftInHalf === 0) return "urgent";
    return "caution";
  }

  // ── Low-time: played in both halves but short of 20-min minimum ──────────
  const required = settings.totalMinutes / 2;
  const shortfall = required - total;
  const remaining = minutesRemaining(elapsed, settings);

  if (shortfall > 0 && shortfall >= remaining * 0.5) return "low-time";

  return "ok";
}

/**
 * Core substitution recommendation engine — "both halves" edition.
 *
 * Priority tiers for bench players coming IN:
 *   Tier 1 (MUST): Player has 0 minutes in the current half AND this is the last
 *                  window where they can get first-half time (mid-first) or
 *                  this is halftime (hard deadline for anyone with 0 first-half min).
 *   Tier 2 (SHOULD): Player has 0 minutes in the current half.
 *   Tier 3 (NICE): Player needs more total minutes to hit the 20-min minimum.
 *
 * Priority tiers for field players going OUT:
 *   Prefer pulling players who have already played in BOTH halves and have the most
 *   total time, so they can afford to sit.
 *   Never pull a player who would then have 0 minutes in a half with no windows left.
 */
export function computeRecommendations(
  players: Player[],
  elapsed: number,
  settings: GameSettings,
  completedWindows: SubWindow[],
  activeWindow: SubWindow
): SubRecommendation[] {
  const halfPoint = settings.totalMinutes / 2;
  const half = currentHalf(elapsed, settings);
  const required = settings.totalMinutes / 2; // 20 min

  // Snapshot effective minutes for all players at this moment
  const withCurrent = players.map((p) => {
    const { first, second, total } = effectiveHalfMinutes(p, elapsed, settings);
    return { ...p, effFirst: first, effSecond: second, effTotal: total };
  });

  const bench = withCurrent.filter((p) => p.status === "off");
  const field = withCurrent.filter((p) => p.status === "on");

  // ── Classify bench players by urgency tier ────────────────────────────────

  // Tier 1: MUST come on — has 0 minutes in a half that is about to close
  // At mid-first (10 min): bench players with 0 first-half minutes. After this
  //   window, halftime is the last chance. Flag as Tier 1 so they're prioritized.
  // At halftime (20 min): bench players with 0 first-half minutes. Hard deadline.
  // At mid-second (30 min): bench players with 0 second-half minutes.
  const tier1Bench = bench.filter((p) => {
    if (activeWindow === "mid-first") {
      // Last window in 1st half — anyone with 0 first-half minutes is urgent
      return p.effFirst === 0;
    }
    if (activeWindow === "halftime") {
      // Hard deadline — anyone who hasn't played in the first half MUST come on
      return p.effFirst === 0;
    }
    if (activeWindow === "mid-second") {
      // Last window in 2nd half — anyone with 0 second-half minutes is urgent
      return p.effSecond === 0;
    }
    return false;
  }).sort((a, b) => a.effTotal - b.effTotal); // least total time first

  // Tier 2: SHOULD come on — hasn't played in current half but not yet at deadline
  const tier2Bench = bench.filter((p) => {
    const playedThisHalf = half === 1 ? p.effFirst > 0 : p.effSecond > 0;
    return !playedThisHalf && !tier1Bench.find((t) => t.id === p.id);
  }).sort((a, b) => a.effTotal - b.effTotal);

  // Tier 3: NICE — needs more total time but has played in both halves
  const tier3Bench = bench.filter((p) => {
    const playedBothHalves = p.effFirst > 0 && (half === 1 || p.effSecond > 0);
    return playedBothHalves && p.effTotal < required;
  }).sort((a, b) => a.effTotal - b.effTotal);

  // Ordered list of bench candidates
  const orderedBench = [...tier1Bench, ...tier2Bench, ...tier3Bench];

  // ── Classify field players by who is safe to pull ─────────────────────────
  // "Safe to pull" = pulling them won't cause them to miss a half.
  // A field player is safe to pull if:
  //   - They have already played in the current half (some time > 0 in this half)
  //   - AND they have already played in the previous half (or we're in the 1st half)
  // Sort by most total time first (pull the most-rested players).

  const safeField = field.filter((p) => {
    const playedThisHalf = half === 1 ? p.effFirst > 0 : p.effSecond > 0;
    const playedPrevHalf = half === 1 ? true : p.effFirst > 0;
    return playedThisHalf && playedPrevHalf;
  }).sort((a, b) => b.effTotal - a.effTotal); // most time first

  // Fallback: if no "safe" field players, pull the one with the most time
  // (best effort — at least we get the urgent bench player on)
  const fallbackField = [...field].sort((a, b) => b.effTotal - a.effTotal);

  // ── Build recommendations ─────────────────────────────────────────────────
  const recs: SubRecommendation[] = [];
  const usedOutIds = new Set<string>();
  const usedInIds = new Set<string>();

  for (const benchPlayer of orderedBench) {
    if (usedInIds.has(benchPlayer.id)) continue;

    // Find the best field player to pull
    const fieldPlayer =
      safeField.find((f) => !usedOutIds.has(f.id)) ||
      fallbackField.find((f) => !usedOutIds.has(f.id));

    if (!fieldPlayer) break;

    // Build a human-readable reason
    let reason = "";
    if (tier1Bench.find((t) => t.id === benchPlayer.id)) {
      if (activeWindow === "halftime" && benchPlayer.effFirst === 0) {
        reason = `${benchPlayer.name} hasn't played in the 1st half — must come on`;
      } else if (activeWindow === "mid-second" && benchPlayer.effSecond === 0) {
        reason = `${benchPlayer.name} hasn't played in the 2nd half yet`;
      } else {
        reason = `${benchPlayer.name} needs 1st-half time before halftime`;
      }
    } else if (tier2Bench.find((t) => t.id === benchPlayer.id)) {
      const halfLabel = half === 1 ? "1st half" : "2nd half";
      reason = `${benchPlayer.name} hasn't played in the ${halfLabel} yet`;
    } else {
      const needed = Math.ceil(required - benchPlayer.effTotal);
      reason = `${benchPlayer.name} needs ~${needed} more min`;
    }

    recs.push({
      playerOut: players.find((p) => p.id === fieldPlayer.id)!,
      playerIn: players.find((p) => p.id === benchPlayer.id)!,
      reason,
    });

    usedOutIds.add(fieldPlayer.id);
    usedInIds.add(benchPlayer.id);
  }

  return recs;
}
