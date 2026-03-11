/**
 * SetupScreen — Roster entry and game settings
 * Design: Clean Coach's App — near-black bg, electric lime accents, Space Grotesk + DM Sans
 */

import { useState, useRef } from "react";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, Trash2, Play, Clock, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const FIELD_BG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663410153353/hocftoyG92dtZTVjDuaoFF/soccer-field-hero-fTHV8xXiyDewPsmcu5yyN3.webp";

export default function SetupScreen() {
  const { state, addPlayer, removePlayer, startGame, dispatch } = useGame();
  const [nameInput, setNameInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const players = state.players;
  const canStart = players.length >= 5 && players.length <= 7;
  const totalMinutes = state.settings.totalMinutes;

  function handleAddPlayer() {
    const name = nameInput.trim();
    if (!name) return;
    if (players.length >= 7) {
      toast.error("Maximum 7 players allowed");
      return;
    }
    if (players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      toast.error("Player name already added");
      return;
    }
    addPlayer(name);
    setNameInput("");
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleAddPlayer();
  }

  function handleStart() {
    if (!canStart) {
      toast.error("Add 5–7 players to start");
      return;
    }
    startGame();
  }

  function setDuration(min: number) {
    dispatch({
      type: "SET_SETTINGS",
      settings: { ...state.settings, totalMinutes: min },
    });
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0d1117]">
      {/* Hero header */}
      <div className="relative h-44 overflow-hidden">
        <img
          src={FIELD_BG}
          alt="Soccer field"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d1117]/20 via-transparent to-[#0d1117]" />
        <div className="relative z-10 flex flex-col items-center justify-end h-full pb-4 px-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[#a3e635] text-2xl">⚽</span>
            <h1 className="text-white font-bold text-2xl tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Sub Manager
            </h1>
          </div>
          <p className="text-white/60 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            8U · 4v4 · Fair Play Tracker
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pt-4 pb-8 space-y-6">

        {/* Game Duration */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-[#a3e635]" />
            <h2 className="text-white/80 text-sm font-semibold uppercase tracking-widest" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Game Duration
            </h2>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[32, 40, 48, 60].map((min) => (
              <button
                key={min}
                onClick={() => setDuration(min)}
                className={`py-3 rounded-xl text-sm font-bold transition-all ${
                  totalMinutes === min
                    ? "bg-[#a3e635] text-[#0d1117]"
                    : "bg-white/8 text-white/60 hover:bg-white/15"
                }`}
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {min}m
              </button>
            ))}
          </div>
          <p className="text-white/40 text-xs mt-2 text-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Each player must play at least {totalMinutes / 2} minutes
          </p>
        </section>

        {/* Roster */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-[#a3e635]" />
              <h2 className="text-white/80 text-sm font-semibold uppercase tracking-widest" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Roster
              </h2>
            </div>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                canStart
                  ? "bg-[#a3e635]/20 text-[#a3e635]"
                  : "bg-white/10 text-white/40"
              }`}
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {players.length} / 7
            </span>
          </div>

          {/* Add player input */}
          <div className="flex gap-2 mb-4">
            <Input
              ref={inputRef}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Player name…"
              className="flex-1 bg-white/8 border-white/15 text-white placeholder:text-white/30 focus:border-[#a3e635] focus:ring-[#a3e635]/20 rounded-xl h-12"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
              maxLength={20}
              disabled={players.length >= 7}
            />
            <Button
              onClick={handleAddPlayer}
              disabled={!nameInput.trim() || players.length >= 7}
              className="h-12 w-12 rounded-xl bg-[#a3e635] hover:bg-[#84cc16] text-[#0d1117] p-0 shrink-0"
            >
              <UserPlus size={20} />
            </Button>
          </div>

          {/* Player list */}
          <div className="space-y-2">
            <AnimatePresence>
              {players.map((player, index) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3 bg-white/6 rounded-xl px-4 py-3 border border-white/8"
                >
                  {/* Jersey number */}
                  <span
                    className="w-8 h-8 rounded-lg bg-[#a3e635]/15 text-[#a3e635] text-sm font-bold flex items-center justify-center shrink-0"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {index + 1}
                  </span>
                  <span
                    className="flex-1 text-white font-medium"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {player.name}
                  </span>
                  {index < 4 && (
                    <span className="text-[10px] text-[#a3e635] font-semibold bg-[#a3e635]/10 px-2 py-0.5 rounded-full">
                      STARTS
                    </span>
                  )}
                  <button
                    onClick={() => removePlayer(player.id)}
                    className="text-white/30 hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>

            {players.length === 0 && (
              <div className="text-center py-8 text-white/30 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Add 5–7 players to get started
              </div>
            )}
          </div>

          {players.length > 0 && players.length < 5 && (
            <p className="text-amber-400/80 text-xs text-center mt-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Add {5 - players.length} more player{5 - players.length !== 1 ? "s" : ""} to start
            </p>
          )}
        </section>

        {/* Start button */}
        <Button
          onClick={handleStart}
          disabled={!canStart}
          className={`w-full h-14 rounded-2xl text-base font-bold transition-all ${
            canStart
              ? "bg-[#a3e635] hover:bg-[#84cc16] text-[#0d1117] shadow-lg shadow-[#a3e635]/20"
              : "bg-white/8 text-white/30 cursor-not-allowed"
          }`}
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          <Play size={20} className="mr-2" />
          Start Game
        </Button>

        {canStart && (
          <p className="text-white/30 text-xs text-center -mt-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            First 4 players start on the field
          </p>
        )}
      </div>
    </div>
  );
}
