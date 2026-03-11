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
  players: [],
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
  | { type: "END_GAME" }
  | { type: "RESET" };

// ─── Reducer ─────────────────────────────────────────────────────────────────

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "SET_ROSTER":
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
        isRunning: false,
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
        isRunning: true,
      };
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

    case "RESET":
      return { ...initialState };

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
