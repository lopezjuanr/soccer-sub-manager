/**
 * Soccer Sub Manager — Core Game Engine
 * Design: Clean Coach's App — near-black + electric lime, urgency-coded player cards
 *
 * Game rules:
 * - 5–7 players on roster
 * - 4 players on field at a time
 * - Each player must play at least 16 min total in a 40-min game
 * - Every player must play at least 7 min in EACH half (1st and 2nd)
 *   — a half with fewer than 7 min does NOT count as "played in that half"
 * - No automatic substitution windows — coaches use manual substitutions only
 *
 * Half definitions (40-min game):
 *   First half:  0:00 – 20:00
 *   Second half: 20:00 – 40:00
 *   Mid-1st:     10:00  ← last chance to get bench players 1st-half time
 *   Halftime:    20:00  ← hard deadline: any player with <7 first-half min MUST come on
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

/** Minimum total minutes a player must play in the game */
export const MIN_TOTAL_MINUTES = 16;

/** Minimum minutes in a single half for it to count as "played in that half" */
export const MIN_HALF_MINUTES = 7;

/**
 * The substitution windows as fractions of total game time.
 * Empty array means no automatic substitution windows — coaches can only use manual subs.
 */
export const SUB_WINDOWS: { id: SubWindow; label: string; fraction: number }[] = [];

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
 * Whether a player's minutes in a half count as "played in that half".
 * Requires at least MIN_HALF_MINUTES (7 min).
 */
export function halfCounts(minutes: number): boolean {
  return minutes >= MIN_HALF_MINUTES;
}

/**
 * Urgency level for a player.
 *
 * Priority order:
 * 1. "critical" — player has NOT met the MIN_HALF_MINUTES threshold in a half that is now over.
 * 2. "urgent" — player has NOT yet met MIN_HALF_MINUTES in the current half and there is ≤1
 *    sub window left in this half to fix it. Must act NOW.
 * 3. "caution" — player has NOT yet met MIN_HALF_MINUTES in the current half but there is still
 *    a sub window coming.
 * 4. "low-time" — player has met both halves but is still short of the 16-min total minimum.
 * 5. "ok" — player has met both halves and is on track for the total minimum.
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

  // ── Critical: missed a half (didn't reach MIN_HALF_MINUTES threshold) ────
  // First half is "over" once we're past halftime
  if (elapsed >= halfPoint && !halfCounts(first)) return "critical";
  // Late in second half with insufficient second-half time
  if (elapsed >= halfPoint && !halfCounts(second) && elapsed >= settings.totalMinutes * 0.9) {
    return "critical";
  }

  // ── Urgent: hasn't met MIN_HALF_MINUTES in current half, running out ──────
  const metThisHalf = half === 1 ? halfCounts(first) : halfCounts(second);

  if (!metThisHalf) {
    const windowsLeftInHalf = half === 1
      ? (completedWindows.includes("mid-first") ? 0 : 1)
      : (completedWindows.includes("mid-second") ? 0 : 1);

    if (windowsLeftInHalf === 0) return "urgent";
    return "caution";
  }

  // ── Low-time: met both halves but short of 16-min total minimum ───────────
  const shortfall = MIN_TOTAL_MINUTES - total;
  const remaining = minutesRemaining(elapsed, settings);

  if (shortfall > 0 && shortfall >= remaining * 0.5) return "low-time";

  return "ok";
}

/**
 * Core substitution recommendation engine — "both halves" edition.
 *
 * A player "counts" as having played in a half only if they have ≥ MIN_HALF_MINUTES (7 min).
 *
 * Priority tiers for bench players coming IN:
 *   Tier 1 (MUST): Player has < MIN_HALF_MINUTES in the current half AND this is the last
 *                  window where they can get enough time in this half.
 *   Tier 2 (SHOULD): Player has < MIN_HALF_MINUTES in the current half.
 *   Tier 3 (NICE): Player needs more total minutes to hit the 16-min minimum.
 *
 * Priority tiers for field players going OUT:
 *   Prefer pulling players who have met MIN_HALF_MINUTES in both halves and have the most
 *   total time, so they can afford to sit.
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

  // Snapshot effective minutes for all players at this moment
  const withCurrent = players.map((p) => {
    const { first, second, total } = effectiveHalfMinutes(p, elapsed, settings);
    return { ...p, effFirst: first, effSecond: second, effTotal: total };
  });

  const bench = withCurrent.filter((p) => p.status === "off");
  const field = withCurrent.filter((p) => p.status === "on");

  // ── Classify bench players by urgency tier ────────────────────────────────

  // Tier 1: MUST come on — has < MIN_HALF_MINUTES in a half that is about to close
  const tier1Bench = bench.filter((p) => {
    if (activeWindow === "mid-first") {
      // After mid-first, only halftime remains for 1st-half time (10 min left)
      // If they need 7 min and only 10 min remain in the half, they must come on now
      return !halfCounts(p.effFirst);
    }
    if (activeWindow === "halftime") {
      // Hard deadline — anyone who hasn't met 1st-half minimum MUST come on
      return !halfCounts(p.effFirst);
    }
    if (activeWindow === "mid-second") {
      // Last window in 2nd half — anyone with < MIN_HALF_MINUTES in 2nd half is urgent
      return !halfCounts(p.effSecond);
    }
    return false;
  }).sort((a, b) => a.effTotal - b.effTotal);

  // Tier 2: SHOULD come on — hasn't met MIN_HALF_MINUTES in current half but not at deadline
  const tier2Bench = bench.filter((p) => {
    const metThisHalf = half === 1 ? halfCounts(p.effFirst) : halfCounts(p.effSecond);
    return !metThisHalf && !tier1Bench.find((t) => t.id === p.id);
  }).sort((a, b) => a.effTotal - b.effTotal);

  // Tier 3: NICE — needs more total time but has met both halves
  const tier3Bench = bench.filter((p) => {
    const metBothHalves = halfCounts(p.effFirst) && (half === 1 || halfCounts(p.effSecond));
    return metBothHalves && p.effTotal < MIN_TOTAL_MINUTES;
  }).sort((a, b) => a.effTotal - b.effTotal);

  // Ordered list of bench candidates
  const orderedBench = [...tier1Bench, ...tier2Bench, ...tier3Bench];

  // ── Classify field players by who is safe to pull ─────────────────────────
  // "Safe to pull" = pulling them won't cause them to miss a half.
  // A field player is safe to pull if they have met MIN_HALF_MINUTES in the current half
  // AND in the previous half (or we're in the 1st half).
  const safeField = field.filter((p) => {
    const metThisHalf = half === 1 ? halfCounts(p.effFirst) : halfCounts(p.effSecond);
    const metPrevHalf = half === 1 ? true : halfCounts(p.effFirst);
    return metThisHalf && metPrevHalf;
  }).sort((a, b) => b.effTotal - a.effTotal); // most time first

  // Fallback: if no "safe" field players, pull the one with the most time
  const fallbackField = [...field].sort((a, b) => b.effTotal - a.effTotal);

  // ── Build recommendations ─────────────────────────────────────────────────
  const recs: SubRecommendation[] = [];
  const usedOutIds = new Set<string>();
  const usedInIds = new Set<string>();

  for (const benchPlayer of orderedBench) {
    if (usedInIds.has(benchPlayer.id)) continue;

    const fieldPlayer =
      safeField.find((f) => !usedOutIds.has(f.id)) ||
      fallbackField.find((f) => !usedOutIds.has(f.id));

    if (!fieldPlayer) break;

    // Build a human-readable reason
    let reason = "";
    if (tier1Bench.find((t) => t.id === benchPlayer.id)) {
      if (activeWindow === "halftime" && !halfCounts(benchPlayer.effFirst)) {
        reason = `${benchPlayer.name} needs 1st-half time — last chance`;
      } else if (activeWindow === "mid-second" && !halfCounts(benchPlayer.effSecond)) {
        reason = `${benchPlayer.name} needs 2nd-half time — last chance`;
      } else {
        reason = `${benchPlayer.name} needs 1st-half time before halftime`;
      }
    } else if (tier2Bench.find((t) => t.id === benchPlayer.id)) {
      const halfLabel = half === 1 ? "1st half" : "2nd half";
      reason = `${benchPlayer.name} needs more ${halfLabel} time`;
    } else {
      const needed = Math.ceil(MIN_TOTAL_MINUTES - benchPlayer.effTotal);
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
