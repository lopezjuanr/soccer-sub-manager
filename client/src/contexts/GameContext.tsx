/**
 * Soccer Sub Manager — Game State Context
 * Design: Clean Coach's App — near-black + electric lime, urgency-coded player cards
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

/**
 * What we persist for the live game.
 * `clockAnchorMs` is the wall-clock time (Date.now()) when the game was last
 * resumed. On reload we add (now - clockAnchorMs) / 1000 to elapsedSeconds so
 * the clock is accurate even after the tab was closed.
 * It is null when the clock is paused (e.g. halftime).
 */
interface GameSnapshot {
  screen: AppScreen;
  players: Player[];
  settings: GameSettings;
  elapsedSeconds: number;
  isRunning: boolean;
  completedWindows: SubWindow[];
  subDialogOpen: boolean;
  activeWindow: SubWindow | null;
  /** Wall-clock ms when the clock was last started/resumed. Null when paused. */
  clockAnchorMs: number | null;
}

function saveGameSnapshot(state: GameState, clockAnchorMs: number | null) {
  if (state.screen === "setup") {
    // Nothing to persist during setup — roster key handles player names
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

/**
 * Load and reconstruct game state from localStorage.
 * If the clock was running when the tab closed, we fast-forward elapsed seconds
 * by the real time that passed since `clockAnchorMs`.
 */
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
      // Cap at total game time
      const totalSec = snap.settings.totalMinutes * 60;
      elapsedSeconds = Math.min(elapsedSeconds, totalSec);
    }

    // If the game ended while the tab was closed, go straight to summary
    const totalSec = snap.settings.totalMinutes * 60;
    if (elapsedSeconds >= totalSec && snap.screen === "game") {
      // Finalize on-field players' minutes
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
      };
    }

    // If we're restoring mid-game, close any open sub dialog so the coach
    // can see the current state cleanly. The auto-trigger effect will re-open
    // it if we're still at a sub window threshold.
    return {
      screen: snap.screen,
      players: snap.players,
      settings: snap.settings,
      elapsedSeconds,
      isRunning: snap.screen === "game", // resume clock if game was live
      completedWindows: snap.completedWindows,
      pendingRecs: [],
      subDialogOpen: false,
      activeWindow: null,
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
  };

  const saved = loadGameSnapshot();
  if (!saved) return base;

  return {
    ...base,
    ...saved,
    // pendingRecs are always recomputed, never restored from storage
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
  | { type: "OPEN_SUB_DIALOG"; window: SubWindow; recs: SubRecommendation[] }
  | { type: "CLOSE_SUB_DIALOG" }
  | { type: "APPLY_SUB"; playerOutId: string; playerInId: string }
  | { type: "COMPLETE_SUB_WINDOW"; window: SubWindow }
  | { type: "SKIP_TO_NEXT_WINDOW" }
  | { type: "END_GAME" }
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
      };
    }

    case "TICK":
      return { ...state, elapsedSeconds: state.elapsedSeconds + 1 };

    case "PAUSE":
      return { ...state, isRunning: false };

    case "RESUME":
      return { ...state, isRunning: true };

    case "OPEN_SUB_DIALOG":
      return {
        ...state,
        // Only pause the clock at halftime; mid-half windows keep the clock running
        isRunning: action.window === "halftime" ? false : state.isRunning,
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
          // Commit the stint's minutes split across halves
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
        // Always ensure clock is running when dismissing a sub window
        isRunning: true,
        subsSinceLastWindow: 0,
      };
    }

    case "SKIP_TO_NEXT_WINDOW": {
      const totalSec = state.settings.totalMinutes * 60;
      const windows = [
        { id: "mid-first" as SubWindow, sec: totalSec * 0.25 },
        { id: "halftime" as SubWindow, sec: totalSec * 0.5 },
        { id: "mid-second" as SubWindow, sec: totalSec * 0.75 },
      ];
      const next = windows.find(
        (w) =>
          !state.completedWindows.includes(w.id) &&
          state.elapsedSeconds < w.sec
      );
      if (next) {
        // Jump to 60 seconds BEFORE the window so the coach has time to react
        const targetSec = Math.max(state.elapsedSeconds + 1, Math.floor(next.sec) - 60);
        return { ...state, elapsedSeconds: targetSec };
      }
      // No more sub windows — skip to end of game
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
      return { ...state, screen: "summary", isRunning: false, players };
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
      return { ...state, screen: "summary", isRunning: false, players };
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
  completeSubWindow: () => void;
  dismissSubWindow: () => void;
  skipToNextWindow: () => void;
  endGame: () => void;
  reset: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedMinutes = state.elapsedSeconds / 60;

  /**
   * clockAnchorRef tracks the wall-clock time (Date.now()) when the clock was
   * last started or resumed. We update it whenever isRunning flips to true and
   * clear it when the clock stops. This is used to persist accurate elapsed
   * time to localStorage so a tab refresh can recover real game time.
   */
  const clockAnchorRef = useRef<number | null>(
    // If we're restoring a running game, anchor to now (we already fast-forwarded
    // elapsed seconds in loadGameSnapshot, so now is the correct new anchor).
    initialState.isRunning ? Date.now() : null
  );

  // ── Timer ──
  useEffect(() => {
    if (state.isRunning && state.screen === "game") {
      // (Re)start the clock — update anchor
      clockAnchorRef.current = Date.now();
      timerRef.current = setInterval(() => dispatch({ type: "TICK" }), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      // Clock stopped — clear anchor
      if (!state.isRunning) clockAnchorRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.isRunning, state.screen]);

  // ── Persist game state to localStorage on every meaningful change ──
  useEffect(() => {
    if (state.screen === "summary") {
      // Game is over — clear the live snapshot so next load starts fresh
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
  ]);

  // ── Auto-trigger sub windows ──
  useEffect(() => {
    if (state.screen !== "game" || !state.isRunning) return;
    const totalSec = state.settings.totalMinutes * 60;
    const windows: { id: SubWindow; sec: number }[] = [
      { id: "mid-first", sec: totalSec * 0.25 },
      { id: "halftime", sec: totalSec * 0.5 },
      { id: "mid-second", sec: totalSec * 0.75 },
    ];
    for (const w of windows) {
      // For mid-half windows (not halftime), skip the dialog if the coach
      // already made at least one manual sub since the last completed window.
      const isMidHalf = w.id === "mid-first" || w.id === "mid-second";
      const alreadySubbed = state.subsSinceLastWindow > 0;
      if (
        state.elapsedSeconds >= w.sec &&
        !state.completedWindows.includes(w.id) &&
        state.activeWindow !== w.id
      ) {
        if (isMidHalf && alreadySubbed) {
          // Coach already made a manual sub — silently mark this window done
          dispatch({ type: "COMPLETE_SUB_WINDOW", window: w.id });
        } else {
          const recs = computeRecommendations(
            state.players,
            elapsedMinutes,
            state.settings,
            state.completedWindows,
            w.id
          );
          dispatch({ type: "OPEN_SUB_DIALOG", window: w.id, recs });
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate([300, 100, 300]);
          }
        }
        break;
      }
    }
    if (state.elapsedSeconds >= totalSec) {
      dispatch({ type: "END_GAME" });
    }
  }, [
    state.elapsedSeconds,
    state.screen,
    state.isRunning,
    state.completedWindows,
    state.activeWindow,
    state.players,
    state.settings,
    state.subsSinceLastWindow,
    elapsedMinutes,
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
        completeSubWindow,
        dismissSubWindow,
        skipToNextWindow,
        endGame,
        reset,
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
