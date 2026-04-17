import React, { useState, useEffect } from "react";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function GameScreen() {
  const {
    state,
    dispatch,
    startGame,
    applySubstitution,
    endGame,
    resumeFromHalftime,
  } = useGame();

  const [selectedOut, setSelectedOut] = useState<string | null>(null);
  const [selectedIn, setSelectedIn] = useState<string | null>(null);
  const [manualSubOpen, setManualSubOpen] = useState(false);
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const [gameDuration, setGameDuration] = useState(40);
  const [durationModalOpen, setDurationModalOpen] = useState(false);

  // Handle game start with duration selection
  const handleStartGame = () => {
    setDurationModalOpen(true);
  };

  const handleConfirmDuration = () => {
    // Set the game duration in settings first, then start the game
    dispatch({
      type: "SET_SETTINGS",
      settings: { ...state.settings, totalMinutes: gameDuration },
    });
    // Start the game after a brief delay to ensure settings are updated
    setTimeout(() => {
      startGame();
    }, 0);
    setDurationModalOpen(false);
  };

  // Handle manual substitution
  const handleManualSub = () => {
    if (selectedOut && selectedIn) {
      applySubstitution(selectedOut, selectedIn);
      setSelectedOut(null);
      setSelectedIn(null);
      setManualSubOpen(false);
      // Resume from halftime if it's open
      if (state.haltimeDialogOpen) {
        resumeFromHalftime();
      }
    }
  };

  // Handle end game
  const handleEndGame = () => {
    endGame();
    setEndConfirmOpen(false);
  };

  if (state.screen === "setup") {
    return (
      <div className="min-h-screen bg-[#0d1117] text-white flex flex-col items-center justify-center p-4">
        {/* Setup Screen */}
        <div className="w-full max-w-md">
          <h1 className="text-4xl font-bold text-center mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            ⚽ Soccer Sub Manager
          </h1>
          <p className="text-center text-white/50 mb-8" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            8U · 4v4 · 40-Minute Game
          </p>

          {/* Roster Section */}
          <div className="mb-8">
            <h2 className="text-sm font-bold text-[#a3e635] mb-4 uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              👥 Roster
            </h2>
            <div className="space-y-2 mb-4">
              {state.players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between bg-[#161b22] border border-white/10 rounded-lg p-2.5"
                >
                  <span className="text-white">{player.name}</span>
                  <button
                    onClick={() => {
                      // Remove player logic would go here
                    }}
                    className="text-white/50 hover:text-white text-sm"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Add Player Input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Player name..."
                className="flex-1 bg-[#161b22] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-[#a3e635]"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.currentTarget.value.trim()) {
                    // Add player logic would go here
                    e.currentTarget.value = "";
                  }
                }}
              />
              <button className="bg-[#a3e635] hover:bg-[#84cc16] text-[#0d1117] font-bold rounded-lg px-4 py-2">
                +
              </button>
            </div>
          </div>

          {/* Start Game Button */}
          <button
            onClick={handleStartGame}
            className="w-full h-12 bg-[#a3e635] hover:bg-[#84cc16] text-[#0d1117] font-bold rounded-lg transition"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            ▶ Start Game
          </button>
        </div>

        {/* Duration Modal */}
        {durationModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-[#161b22] border border-white/10 text-white max-w-sm mx-auto rounded-2xl p-6 shadow-lg">
              <h2 className="text-white font-bold text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Game Duration
              </h2>
              <p className="text-white/50 text-sm mt-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Select how long you want the game to be
              </p>
              <div className="grid grid-cols-5 gap-2 mt-4">
                {[20, 25, 30, 35, 40].map((min) => (
                  <button
                    key={min}
                    onClick={() => setGameDuration(min)}
                    className={`py-2 rounded-lg font-bold transition ${
                      gameDuration === min
                        ? "bg-[#a3e635] text-[#0d1117] ring-2 ring-[#a3e635]"
                        : "bg-[#0d1117] border border-white/10 text-white hover:border-[#a3e635]"
                    }`}
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {min}m
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setDurationModalOpen(false)}
                  className="flex-1 h-10 bg-[#0d1117] border border-white/10 text-white rounded-lg hover:border-white/20 font-bold"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDuration}
                  className="flex-1 h-10 bg-[#a3e635] hover:bg-[#84cc16] text-[#0d1117] rounded-lg font-bold"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Start {gameDuration}m Game
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Game Screen
  return (
    <div className="min-h-screen bg-[#0d1117] text-white flex flex-col p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            ⚽ Game Live
          </h1>
          <span className="text-3xl font-bold text-[#a3e635]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {Math.floor(state.elapsedSeconds / 60)}:{String(state.elapsedSeconds % 60).padStart(2, "0")}
          </span>
        </div>
        <div className="w-full bg-[#161b22] rounded-full h-0.5 overflow-hidden">
          <div
            className="h-full bg-[#a3e635] transition-all"
            style={{
              width: `${(state.elapsedSeconds / (state.settings.totalMinutes * 60)) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => dispatch({ type: state.isRunning ? "PAUSE" : "RESUME" })}
          className="flex-1 h-10 bg-[#161b22] border border-white/10 text-white rounded-lg hover:border-white/20 font-bold"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {state.isRunning ? "⏸ Pause" : "▶ Resume"}
        </button>
        <button
          onClick={() => setManualSubOpen(true)}
          className="flex-1 h-10 bg-[#161b22] border border-white/10 text-white rounded-lg hover:border-white/20 font-bold"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          🔄 Sub
        </button>
        <button
          onClick={() => setEndConfirmOpen(true)}
          className="flex-1 h-10 bg-[#161b22] border border-white/10 text-white rounded-lg hover:border-white/20 font-bold"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          ⏹ End
        </button>
      </div>

      {/* Players */}
      <div className="flex-1 overflow-y-auto">
        <h3 className="text-sm font-bold text-[#a3e635] mb-3 uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          🟢 ON FIELD ({state.players.filter((p) => p.status === "on").length}/4)
        </h3>
        <div className="space-y-2 mb-6">
          {state.players
            .filter((p) => p.status === "on")
            .map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between bg-[#161b22] border border-white/10 rounded-lg p-2.5"
              >
                <span className="text-white">{player.name}</span>
                <span className="text-white/50 text-sm">{Math.floor(player.minutesPlayed)}m</span>
              </div>
            ))}
        </div>

        <h3 className="text-sm font-bold text-white/50 mb-3 uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          🔴 BENCH ({state.players.filter((p) => p.status === "off").length}/3)
        </h3>
        <div className="space-y-2">
          {state.players
            .filter((p) => p.status === "off")
            .map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between bg-[#161b22] border border-white/10 rounded-lg p-2.5"
              >
                <span className="text-white">{player.name}</span>
                <span className="text-white/50 text-sm">{Math.floor(player.minutesPlayed)}m</span>
              </div>
            ))}
        </div>
      </div>

      {/* Manual Sub Dialog */}
      <Dialog open={manualSubOpen} onOpenChange={setManualSubOpen}>
        <DialogContent className="bg-[#161b22] border-white/10 text-white max-w-sm mx-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle
              className="text-white font-bold text-lg"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Manual Substitution
            </DialogTitle>
          </DialogHeader>
          <p className="text-white/50 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Tap to select — counts must match
          </p>

          <div>
            <h4 className="text-red-400 text-sm font-bold mb-2 uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              🔴 PLAYER OUT (ON FIELD)
            </h4>
            <div className="space-y-2 mb-4">
              {state.players
                .filter((p) => p.status === "on")
                .map((player) => (
                  <button
                    key={player.id}
                    onClick={() => setSelectedOut(player.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition ${
                      selectedOut === player.id
                        ? "bg-red-900/40 border-red-500"
                        : "bg-[#0d1117] border-white/10 hover:border-red-500/50"
                    } border`}
                  >
                    {player.name} · {Math.floor(player.minutesPlayed)}m
                  </button>
                ))}
            </div>
          </div>

          <div>
            <h4 className="text-[#a3e635] text-sm font-bold mb-2 uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              🟢 PLAYER IN (BENCH)
            </h4>
            <div className="space-y-2 mb-4">
              {state.players
                .filter((p) => p.status === "off")
                .map((player) => (
                  <button
                    key={player.id}
                    onClick={() => setSelectedIn(player.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition ${
                      selectedIn === player.id
                        ? "bg-[#a3e635]/20 border-[#a3e635]"
                        : "bg-[#0d1117] border-white/10 hover:border-[#a3e635]/50"
                    } border`}
                  >
                    {player.name} · {Math.floor(player.minutesPlayed)}m
                  </button>
                ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setSelectedOut(null);
                setSelectedIn(null);
                setManualSubOpen(false);
              }}
              className="flex-1 h-10 bg-[#0d1117] border border-white/10 text-white rounded-lg hover:border-white/20 font-bold"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Cancel
            </button>
            <button
              onClick={handleManualSub}
              disabled={!selectedOut || !selectedIn}
              className="flex-1 h-10 bg-[#a3e635] hover:bg-[#84cc16] disabled:bg-[#a3e635]/50 text-[#0d1117] rounded-lg font-bold"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Confirm Sub
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Halftime Dialog - Conditional Render */}
      {state.haltimeDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-[#161b22] border border-white/10 text-white max-w-sm mx-auto rounded-2xl p-6 shadow-lg">
            <h2 className="text-white font-bold text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              ⏸ Halftime
            </h2>
            <p className="text-white/50 text-sm mt-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              The clock is paused. Make substitutions if needed, then resume the game.
            </p>
            <div className="flex gap-2 mt-4">
              <Button
                onClick={() => {
                  setManualSubOpen(true);
                }}
                className="flex-1 h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Make Subs
              </Button>
              <Button
                onClick={() => {
                  resumeFromHalftime();
                }}
                className="flex-1 h-11 rounded-xl bg-[#a3e635] hover:bg-[#84cc16] text-[#0d1117] font-bold"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Resume
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* End Game Confirm */}
      <Dialog open={endConfirmOpen} onOpenChange={setEndConfirmOpen}>
        <DialogContent className="bg-[#161b22] border-white/10 text-white max-w-sm mx-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle
              className="text-white font-bold text-lg"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              End Game?
            </DialogTitle>
          </DialogHeader>
          <p className="text-white/50 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Are you sure you want to end the game? You'll see the summary.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setEndConfirmOpen(false)}
              className="flex-1 h-10 bg-[#0d1117] border border-white/10 text-white rounded-lg hover:border-white/20 font-bold"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Cancel
            </button>
            <button
              onClick={handleEndGame}
              className="flex-1 h-10 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              End Game
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
