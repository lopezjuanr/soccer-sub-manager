/**
 * Soccer Sub Manager — Game State Context
 * Design: Clean Coach's App — near-black + electric lime, urgency-coded player cards
 *
 * Halftime rule:
 * - Clock automatically pauses at exactly totalMinutes/2 * 60 seconds.
 * - atHalftime flag is set to true.
 * - Clock does NOT resume until the coach confirms a substitution while atHalftime is true.
 * - Only HALFTIME_SUB_CONFIRMED clears atHalftime and resumes the clock.
 *
 * Persistence strategy:
 * - ROSTER_KEY: stores player names only (persists across games)
 * - GAME_KEY: stores the full live game state snapshot + a wall-clock anchor
 *   so that on tab refresh the elapsed time can be reconstructed from real time.
 * - On RESET or END_GAME the game snapshot is cleared.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from "react";
import { nanoid } from "nanoid";
import {
  DEFAULT_SETTINGS,
  GameSettings,
  Player,
  SubRecommendation,
  SubWindow,
  computeRecommendations,
  effectiveMinutes,
} from "@/lib/gameEngine";

// ─── Storage keys ────────────────────────────────────────────────────────────

const ROSTER_KEY = "soccer-sub-manager-roster";
const GAME_KEY = "soccer-sub-manager-game";

// ─── Roster helpers ───────────────────────────────────────────────────────────

function loadSavedRoster(): Player[] {
  try {
    const raw = localStorage.getItem(ROSTER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { id: string; name: string }[];
    return parsed.map((p) => ({
      id: p.id,
      name: p.name,
      minutesPlayed: 0,
      status: "off" as const,
      lastOnAt: null,
      firstHalfMinutes: 0,
      secondHalfMinutes: 0,
    }));
  } catch {
    return [];
  }
}

function saveRoster(players: Player[]) {
  try {
    localStorage.setItem(
      ROSTER_KEY,
      JSON.stringify(players.map((p) => ({ id: p.id, name: p.name })))
    );
  } catch {
    // ignore storage errors
  }
}

// ─── Game snapshot helpers ────────────────────────────────────────────────────

interface GameSnapshot {
  screen: AppScreen;
  players: Player[];
  settings: GameSettings;
  elapsedSeconds: number;
  isRunning: boolean;
  completedWindows: SubWindow[];
  subDialogOpen: boolean;
  activeWindow: SubWindow | null;
  atHalftime: boolean;
  /** Wall-clock ms when the clock was last started/resumed. Null when paused. */
  clockAnchorMs: number | null;
}

function saveGameSnapshot(state: GameState, clockAnchorMs: number | null) {
  if (state.screen === "setup") {
    localStorage.removeItem(GAME_KEY);
    return;
  }
  try {
    const snap: GameSnapshot = {
      screen: state.screen,
      players: state.players,
      settings: state.settings,
      elapsedSeconds: state.elapsedSeconds,
      isRunning: state.isRunning,
      completedWindows: state.completedWindows,
      subDialogOpen: state.subDialogOpen,
      activeWindow: state.activeWindow,
      atHalftime: state.atHalftime,
      clockAnchorMs,
    };
    localStorage.setItem(GAME_KEY, JSON.stringify(snap));
  } catch {
    // ignore
  }
}

function clearGameSnapshot() {
  try {
    localStorage.removeItem(GAME_KEY);
  } catch {
    // ignore
  }
}

function loadGameSnapshot(): Partial<GameState> | null {
  try {
    const raw = localStorage.getItem(GAME_KEY);
    if (!raw) return null;
    const snap: GameSnapshot = JSON.parse(raw);

    let elapsedSeconds = snap.elapsedSeconds;

    // If the clock was running when the tab closed, add real elapsed time
    if (snap.isRunning && snap.clockAnchorMs !== null) {
      const realElapsed = Math.floor((Date.now() - snap.clockAnchorMs) / 1000);
      elapsedSeconds = snap.elapsedSeconds + realElapsed;
      const totalSec = snap.settings.totalMinutes * 60;
      elapsedSeconds = Math.min(elapsedSeconds, totalSec);
    }

    // If the game ended while the tab was closed, go straight to summary
    const totalSec = snap.settings.totalMinutes * 60;
    if (elapsedSeconds >= totalSec && snap.screen === "game") {
      const elapsedMin = totalSec / 60;
      const players = snap.players.map((p) => {
        if (p.status === "on" && p.lastOnAt !== null) {
          return {
            ...p,
            minutesPlayed: p.minutesPlayed + (elapsedMin - p.lastOnAt),
            status: "off" as const,
            lastOnAt: null,
          };
        }
        return p;
      });
      clearGameSnapshot();
      return {
        screen: "summary",
        players,
        settings: snap.settings,
        elapsedSeconds: totalSec,
        isRunning: false,
        completedWindows: snap.completedWindows,
        pendingRecs: [],
        subDialogOpen: false,
        activeWindow: null,
        atHalftime: false,
        scoreUs: 0,
        scoreThem: 0,
      };
    }

    return {
      screen: snap.screen,
      players: snap.players,
      settings: snap.settings,
      elapsedSeconds,
      // If we were at halftime (clock paused waiting for sub), stay paused
      isRunning: snap.screen === "game" && !snap.atHalftime,
      completedWindows: snap.completedWindows,
      pendingRecs: [],
      subDialogOpen: false,
      activeWindow: null,
      atHalftime: snap.atHalftime ?? false,
    };
  } catch {
    return null;
  }
}

// ─── State ───────────────────────────────────────────────────────────────────

export type AppScreen = "setup" | "game" | "summary";

export interface GameState {
  screen: AppScreen;
  players: Player[];
  settings: GameSettings;
  /** Game clock in seconds */
  elapsedSeconds: number;
  isRunning: boolean;
  /** Which sub windows have been completed */
  completedWindows: SubWindow[];
  /** Pending recommendations for the current sub window */
  pendingRecs: SubRecommendation[];
  /** Whether the sub dialog is open */
  subDialogOpen: boolean;
  /** Current active sub window (if any) */
  activeWindow: SubWindow | null;
  /** Number of manual subs made since the last completed sub window */
  subsSinceLastWindow: number;
  /**
   * True when the clock has been paused at halftime and is waiting for
   * the coach to confirm a substitution before resuming.
   */
  atHalftime: boolean;
  /** Live score — our team */
  scoreUs: number;
  /** Live score — opponent */
  scoreThem: number;
}

function buildInitialState(): GameState {
  const base: GameState = {
    screen: "setup",
    players: loadSavedRoster(),
    settings: DEFAULT_SETTINGS,
    elapsedSeconds: 0,
    isRunning: false,
    completedWindows: [],
    pendingRecs: [],
    subDialogOpen: false,
    activeWindow: null,
    subsSinceLastWindow: 0,
    atHalftime: false,
    scoreUs: 0,
    scoreThem: 0,
  };

  const saved = loadGameSnapshot();
  if (!saved) return base;

  return {
    ...base,
    ...saved,
    pendingRecs: [],
  };
}

const initialState: GameState = buildInitialState();

// ─── Actions ─────────────────────────────────────────────────────────────────

type Action =
  | { type: "SET_ROSTER"; players: Player[] }
  | { type: "SET_SETTINGS"; settings: GameSettings }
  | { type: "START_GAME" }
  | { type: "TICK" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "PAUSE_FOR_HALFTIME" }
  | { type: "HALFTIME_SUB_CONFIRMED" }
  | { type: "OPEN_SUB_DIALOG"; window: SubWindow; recs: SubRecommendation[] }
  | { type: "CLOSE_SUB_DIALOG" }
  | { type: "APPLY_SUB"; playerOutId: string; playerInId: string }
  | { type: "COMPLETE_SUB_WINDOW"; window: SubWindow }
  | { type: "SKIP_TO_NEXT_WINDOW" }
  | { type: "END_GAME" }
  | { type: "SCORE_INCREMENT"; team: "us" | "them" }
  | { type: "SCORE_DECREMENT"; team: "us" | "them" }
  | { type: "RESET" };

// ─── Reducer ─────────────────────────────────────────────────────────────────

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "SET_ROSTER":
      saveRoster(action.players);
      return { ...state, players: action.players };

    case "SET_SETTINGS":
      return { ...state, settings: action.settings };

    case "START_GAME": {
      const players = state.players.map((p, i) => ({
        ...p,
        status: (i < state.settings.fieldSize ? "on" : "off") as "on" | "off",
        lastOnAt: i < state.settings.fieldSize ? 0 : null,
        minutesPlayed: 0,
        firstHalfMinutes: 0,
        secondHalfMinutes: 0,
      }));
      return {
        ...state,
        screen: "game",
        players,
        elapsedSeconds: 0,
        isRunning: true,
        completedWindows: [],
        pendingRecs: [],
        subDialogOpen: false,
        activeWindow: null,
        subsSinceLastWindow: 0,
        atHalftime: false,
        scoreUs: 0,
        scoreThem: 0,
      };
    }

    case "TICK":
      return { ...state, elapsedSeconds: state.elapsedSeconds + 1 };

    case "PAUSE":
      return { ...state, isRunning: false };

    case "RESUME":
      // Only allow manual resume if NOT waiting for a halftime sub
      if (state.atHalftime) return state;
      return { ...state, isRunning: true };

    case "PAUSE_FOR_HALFTIME":
      // Stop the clock and mark that we are waiting for a halftime substitution
      return { ...state, isRunning: false, atHalftime: true };

    case "HALFTIME_SUB_CONFIRMED":
      // Coach has confirmed a sub during halftime — clear the flag and restart clock
      return {
        ...state,
        atHalftime: false,
        isRunning: true,
        subsSinceLastWindow: 0,
      };

    case "OPEN_SUB_DIALOG":
      return {
        ...state,
        subDialogOpen: true,
        activeWindow: action.window,
        pendingRecs: action.recs,
      };

    case "CLOSE_SUB_DIALOG":
      return { ...state, subDialogOpen: false, activeWindow: null };

    case "APPLY_SUB": {
      const elapsed = state.elapsedSeconds / 60;
      const halfPoint = state.settings.totalMinutes / 2;
      const players = state.players.map((p) => {
        if (p.id === action.playerOutId) {
          const stintStart = p.lastOnAt ?? elapsed;
          const stintEnd = elapsed;
          const firstAdd = Math.max(0, Math.min(stintEnd, halfPoint) - Math.min(stintStart, halfPoint));
          const secondAdd = Math.max(0, Math.max(stintEnd, halfPoint) - Math.max(stintStart, halfPoint));
          return {
            ...p,
            status: "off" as const,
            minutesPlayed: effectiveMinutes(p, elapsed),
            firstHalfMinutes: p.firstHalfMinutes + firstAdd,
            secondHalfMinutes: p.secondHalfMinutes + secondAdd,
            lastOnAt: null,
          };
        }
        if (p.id === action.playerInId) {
          return { ...p, status: "on" as const, lastOnAt: elapsed };
        }
        return p;
      });
      return { ...state, players, subsSinceLastWindow: state.subsSinceLastWindow + 1 };
    }

    case "COMPLETE_SUB_WINDOW": {
      return {
        ...state,
        completedWindows: [...state.completedWindows, action.window],
        subDialogOpen: false,
        activeWindow: null,
        isRunning: true,
        subsSinceLastWindow: 0,
      };
    }

    case "SKIP_TO_NEXT_WINDOW": {
      const totalSec = state.settings.totalMinutes * 60;
      const halftimeSec = totalSec * 0.5;

      // If we haven't hit halftime yet, jump to just before halftime
      if (state.elapsedSeconds < halftimeSec) {
        const targetSec = Math.max(state.elapsedSeconds + 1, Math.floor(halftimeSec) - 10);
        return { ...state, elapsedSeconds: targetSec };
      }

      // If we're past halftime, skip to end of game
      const elapsed = totalSec / 60;
      const halfPoint = state.settings.totalMinutes / 2;
      const players = state.players.map((p) => {
        if (p.status === "on" && p.lastOnAt !== null) {
          const stintStart = p.lastOnAt;
          const firstAdd = Math.max(0, Math.min(elapsed, halfPoint) - Math.min(stintStart, halfPoint));
          const secondAdd = Math.max(0, Math.max(elapsed, halfPoint) - Math.max(stintStart, halfPoint));
          return {
            ...p,
            minutesPlayed: effectiveMinutes(p, elapsed),
            firstHalfMinutes: p.firstHalfMinutes + firstAdd,
            secondHalfMinutes: p.secondHalfMinutes + secondAdd,
            status: "off" as const,
            lastOnAt: null,
          };
        }
        return p;
      });
      return { ...state, screen: "summary", isRunning: false, atHalftime: false, players };
    }

    case "END_GAME": {
      const elapsed = state.elapsedSeconds / 60;
      const halfPoint = state.settings.totalMinutes / 2;
      const players = state.players.map((p) => {
        if (p.status === "on" && p.lastOnAt !== null) {
          const stintStart = p.lastOnAt;
          const firstAdd = Math.max(0, Math.min(elapsed, halfPoint) - Math.min(stintStart, halfPoint));
          const secondAdd = Math.max(0, Math.max(elapsed, halfPoint) - Math.max(stintStart, halfPoint));
          return {
            ...p,
            minutesPlayed: effectiveMinutes(p, elapsed),
            firstHalfMinutes: p.firstHalfMinutes + firstAdd,
            secondHalfMinutes: p.secondHalfMinutes + secondAdd,
            status: "off" as const,
            lastOnAt: null,
          };
        }
        return p;
      });
      clearGameSnapshot();
      return { ...state, screen: "summary", isRunning: false, atHalftime: false, players };
    }

    case "SCORE_INCREMENT": {
      if (action.team === "us") return { ...state, scoreUs: state.scoreUs + 1 };
      return { ...state, scoreThem: state.scoreThem + 1 };
    }

    case "SCORE_DECREMENT": {
      if (action.team === "us") return { ...state, scoreUs: Math.max(0, state.scoreUs - 1) };
      return { ...state, scoreThem: Math.max(0, state.scoreThem - 1) };
    }

    case "RESET": {
      const savedRoster = loadSavedRoster();
      return {
        screen: "setup",
        players: savedRoster,
        settings: DEFAULT_SETTINGS,
        elapsedSeconds: 0,
        isRunning: false,
        completedWindows: [],
        pendingRecs: [],
        subDialogOpen: false,
        activeWindow: null,
        subsSinceLastWindow: 0,
        atHalftime: false,
        scoreUs: 0,
        scoreThem: 0,
      };
    }

    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface GameContextValue {
  state: GameState;
  dispatch: React.Dispatch<Action>;
  elapsedMinutes: number;
  addPlayer: (name: string) => void;
  removePlayer: (id: string) => void;
  startGame: () => void;
  applySubstitution: (playerOutId: string, playerInId: string) => void;
  confirmHalftimeSub: (playerOutIds: string[], playerInIds: string[]) => void;
  completeSubWindow: () => void;
  dismissSubWindow: () => void;
  skipToNextWindow: () => void;
  endGame: () => void;
  reset: () => void;
  incrementScore: (team: "us" | "them") => void;
  decrementScore: (team: "us" | "them") => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedMinutes = state.elapsedSeconds / 60;

  const clockAnchorRef = useRef<number | null>(
    initialState.isRunning ? Date.now() : null
  );

  // ── Timer ──
  useEffect(() => {
    if (state.isRunning && state.screen === "game") {
      clockAnchorRef.current = Date.now();
      timerRef.current = setInterval(() => dispatch({ type: "TICK" }), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (!state.isRunning) clockAnchorRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.isRunning, state.screen]);

  // ── Persist game state to localStorage ──
  useEffect(() => {
    if (state.screen === "summary") {
      clearGameSnapshot();
      return;
    }
    saveGameSnapshot(state, clockAnchorRef.current);
  }, [
    state.screen,
    state.players,
    state.elapsedSeconds,
    state.isRunning,
    state.completedWindows,
    state.subDialogOpen,
    state.activeWindow,
    state.settings,
    state.atHalftime,
  ]);

  // ── Halftime auto-pause ──
  // Fires when the clock hits exactly the halftime second.
  // Only triggers once per game (guarded by !state.atHalftime and
  // !completedWindows includes a "halftime" sentinel).
  useEffect(() => {
    if (state.screen !== "game" || !state.isRunning) return;

    const halftimeSec = state.settings.totalMinutes * 30; // totalMinutes/2 * 60
    const totalSec = state.settings.totalMinutes * 60;

    // Check for game over
    if (state.elapsedSeconds >= totalSec) {
      dispatch({ type: "END_GAME" });
      return;
    }

    // Trigger halftime pause when clock reaches halftime second
    // Guard: only if we haven't already been through halftime this game
    if (
      state.elapsedSeconds >= halftimeSec &&
      !state.atHalftime &&
      !state.completedWindows.includes("halftime")
    ) {
      dispatch({ type: "PAUSE_FOR_HALFTIME" });
    }
  }, [
    state.elapsedSeconds,
    state.screen,
    state.isRunning,
    state.atHalftime,
    state.completedWindows,
    state.settings,
  ]);

  const addPlayer = useCallback(
    (name: string) => {
      const player: Player = {
        id: nanoid(),
        name: name.trim(),
        minutesPlayed: 0,
        status: "off",
        lastOnAt: null,
        firstHalfMinutes: 0,
        secondHalfMinutes: 0,
      };
      dispatch({ type: "SET_ROSTER", players: [...state.players, player] });
    },
    [state.players]
  );

  const removePlayer = useCallback(
    (id: string) => {
      dispatch({
        type: "SET_ROSTER",
        players: state.players.filter((p) => p.id !== id),
      });
    },
    [state.players]
  );

  const startGame = useCallback(() => dispatch({ type: "START_GAME" }), []);

  const applySubstitution = useCallback(
    (playerOutId: string, playerInId: string) =>
      dispatch({ type: "APPLY_SUB", playerOutId, playerInId }),
    []
  );

  /**
   * Apply one or more substitutions during halftime and restart the clock.
   * This is the ONLY path that resumes the clock after halftime.
   */
  const confirmHalftimeSub = useCallback(
    (playerOutIds: string[], playerInIds: string[]) => {
      // Apply each sub pair
      playerOutIds.forEach((outId, i) => {
        dispatch({ type: "APPLY_SUB", playerOutId: outId, playerInId: playerInIds[i] });
      });
      // Mark halftime as done and restart clock
      dispatch({ type: "COMPLETE_SUB_WINDOW", window: "halftime" });
      dispatch({ type: "HALFTIME_SUB_CONFIRMED" });
    },
    []
  );

  const completeSubWindow = useCallback(() => {
    if (state.activeWindow) {
      dispatch({ type: "COMPLETE_SUB_WINDOW", window: state.activeWindow });
    }
  }, [state.activeWindow]);

  const dismissSubWindow = useCallback(() => {
    if (state.activeWindow) {
      dispatch({ type: "COMPLETE_SUB_WINDOW", window: state.activeWindow });
    }
  }, [state.activeWindow]);

  const skipToNextWindow = useCallback(
    () => dispatch({ type: "SKIP_TO_NEXT_WINDOW" }),
    []
  );
  const endGame = useCallback(() => dispatch({ type: "END_GAME" }), []);
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);
  const incrementScore = useCallback(
    (team: "us" | "them") => dispatch({ type: "SCORE_INCREMENT", team }),
    []
  );
  const decrementScore = useCallback(
    (team: "us" | "them") => dispatch({ type: "SCORE_DECREMENT", team }),
    []
  );

  return (
    <GameContext.Provider
      value={{
        state,
        dispatch,
        elapsedMinutes,
        addPlayer,
        removePlayer,
        startGame,
        applySubstitution,
        confirmHalftimeSub,
        completeSubWindow,
        dismissSubWindow,
        skipToNextWindow,
        endGame,
        reset,
        incrementScore,
        decrementScore,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
