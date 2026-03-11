/**
 * Soccer Sub Manager — Game State Context
 * Design: Clean Coach's App — near-black + electric lime, urgency-coded player cards
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

const ROSTER_KEY = "soccer-sub-manager-roster";

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
}

const initialState: GameState = {
  screen: "setup",
  players: loadSavedRoster(),
  settings: DEFAULT_SETTINGS,
  elapsedSeconds: 0,
  isRunning: false,
  completedWindows: [],
  pendingRecs: [],
  subDialogOpen: false,
  activeWindow: null,
};

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
      const players = state.players.map((p) => {
        if (p.id === action.playerOutId) {
          return {
            ...p,
            status: "off" as const,
            minutesPlayed: effectiveMinutes(p, elapsed),
            lastOnAt: null,
          };
        }
        if (p.id === action.playerInId) {
          return { ...p, status: "on" as const, lastOnAt: elapsed };
        }
        return p;
      });
      return { ...state, players };
    }

    case "COMPLETE_SUB_WINDOW": {
      return {
        ...state,
        completedWindows: [...state.completedWindows, action.window],
        subDialogOpen: false,
        activeWindow: null,
        // Always ensure clock is running when dismissing a sub window
        isRunning: true,
      };
    }

    case "SKIP_TO_NEXT_WINDOW": {
      const totalSec = state.settings.totalMinutes * 60;
      const windows = [
        { id: "mid-first" as SubWindow, sec: totalSec * 0.25 },
        { id: "halftime" as SubWindow, sec: totalSec * 0.5 },
        { id: "mid-second" as SubWindow, sec: totalSec * 0.75 },
      ];
      // Find the next sub window that hasn't been completed and is still ahead
      const next = windows.find(
        (w) =>
          !state.completedWindows.includes(w.id) &&
          state.elapsedSeconds < w.sec
      );
      if (next) {
        // Jump clock to that window so the useEffect triggers it
        return { ...state, elapsedSeconds: Math.floor(next.sec) };
      }
      // No more sub windows — skip to end of game
      const elapsed = totalSec / 60;
      const players = state.players.map((p) => {
        if (p.status === "on" && p.lastOnAt !== null) {
          return {
            ...p,
            minutesPlayed: effectiveMinutes(p, elapsed),
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
      const players = state.players.map((p) => {
        if (p.status === "on" && p.lastOnAt !== null) {
          return {
            ...p,
            minutesPlayed: effectiveMinutes(p, elapsed),
            status: "off" as const,
            lastOnAt: null,
          };
        }
        return p;
      });
      return { ...state, screen: "summary", isRunning: false, players };
    }

    case "RESET": {
      // Restore the saved roster (stats cleared) so players persist across games
      const savedRoster = loadSavedRoster();
      return {
        ...initialState,
        players: savedRoster,
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

  // ── Timer ──
  useEffect(() => {
    if (state.isRunning && state.screen === "game") {
      timerRef.current = setInterval(() => dispatch({ type: "TICK" }), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.isRunning, state.screen]);

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
      if (
        state.elapsedSeconds >= w.sec &&
        !state.completedWindows.includes(w.id) &&
        state.activeWindow !== w.id
      ) {
        const recs = computeRecommendations(
          state.players,
          elapsedMinutes,
          state.settings
        );
        dispatch({ type: "OPEN_SUB_DIALOG", window: w.id, recs });
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
