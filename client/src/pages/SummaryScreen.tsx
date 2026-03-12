/**
 * SummaryScreen — Post-game fair play summary
 * Design: Clean Coach's App — near-black bg, electric lime accents, Space Grotesk + DM Sans
 */

import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, RotateCcw, Trophy, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { MIN_TOTAL_MINUTES, MIN_HALF_MINUTES, halfCounts } from "@/lib/gameEngine";

function formatMinSec(totalMinutes: number) {
  const m = Math.floor(totalMinutes);
  const s = Math.round((totalMinutes - m) * 60);
  if (s === 0) return `${m}:00`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function SummaryScreen() {
  const { state, reset } = useGame();
  const { players, settings } = state;
  const sorted = [...players].sort((a, b) => b.minutesPlayed - a.minutesPlayed);
  const allMetMinimum = sorted.every((p) => p.minutesPlayed >= MIN_TOTAL_MINUTES);
  const allPlayedBothHalves = sorted.every(
    (p) => halfCounts(p.firstHalfMinutes) && halfCounts(p.secondHalfMinutes)
  );
  const allGood = allMetMinimum && allPlayedBothHalves;
  const totalPlayed = sorted.reduce((sum, p) => sum + p.minutesPlayed, 0);

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col">
      {/* Header */}
      <div className="px-4 pt-10 pb-5 text-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
            allGood ? "bg-[#a3e635]/15" : "bg-amber-500/15"
          }`}
        >
          <Trophy size={32} className={allGood ? "text-[#a3e635]" : "text-amber-400"} />
        </motion.div>

        <h1
          className="text-white font-bold text-2xl"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Game Summary
        </h1>
        <p
          className="text-white/50 text-sm mt-1"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {settings.totalMinutes}-min game · {players.length} players · min {MIN_TOTAL_MINUTES} min each
        </p>

        {/* Fair play status badges */}
        <div className="flex flex-col items-center gap-2 mt-3">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
              allMetMinimum
                ? "bg-[#a3e635]/15 text-[#a3e635] border border-[#a3e635]/25"
                : "bg-red-500/15 text-red-400 border border-red-500/25"
            }`}
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {allMetMinimum ? (
              <><CheckCircle2 size={15} /> All players met {MIN_TOTAL_MINUTES}-min minimum</>
            ) : (
              <><XCircle size={15} /> Some players missed the {MIN_TOTAL_MINUTES}-min minimum</>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
              allPlayedBothHalves
                ? "bg-[#a3e635]/15 text-[#a3e635] border border-[#a3e635]/25"
                : "bg-red-500/15 text-red-400 border border-red-500/25"
            }`}
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {allPlayedBothHalves ? (
              <><CheckCircle2 size={15} /> All players played in both halves</>
            ) : (
              <><XCircle size={15} /> Some players missed a half</>
            )}
          </motion.div>
        </div>
      </div>

      {/* Playing time table */}
      <div className="px-4 pb-4">
        <div className="bg-white/4 rounded-2xl border border-white/8 overflow-hidden">
          {/* Table header */}
          <div className="flex items-center px-4 py-2.5 border-b border-white/8 bg-white/3">
            <span
              className="flex-1 text-white/40 text-xs font-bold uppercase tracking-widest"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Player
            </span>
            <span
              className="w-10 text-center text-white/40 text-xs font-bold uppercase tracking-widest"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              1st
            </span>
            <span
              className="w-10 text-center text-white/40 text-xs font-bold uppercase tracking-widest"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              2nd
            </span>
            <span
              className="w-14 text-right text-white/40 text-xs font-bold uppercase tracking-widest"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Total
            </span>
            <span className="w-6" />
          </div>

          {/* Player rows */}
          {sorted.map((player, i) => {
            const metMinimum = player.minutesPlayed >= MIN_TOTAL_MINUTES;
            const playedFirst = halfCounts(player.firstHalfMinutes);
            const playedSecond = halfCounts(player.secondHalfMinutes);
            const allOk = metMinimum && playedFirst && playedSecond;
            const pct = Math.min(100, (player.minutesPlayed / MIN_TOTAL_MINUTES) * 100);

            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 + 0.15 }}
                className={`border-b border-white/6 last:border-0 ${
                  allOk ? "" : "bg-red-500/5"
                }`}
              >
                <div className="flex items-center px-4 py-3 gap-2">
                  {/* Rank number */}
                  <span
                    className="w-4 text-white/25 text-xs font-bold tabular-nums shrink-0"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {i + 1}
                  </span>

                  {/* Name + bar */}
                  <div className="flex-1 min-w-0">
                    <span
                      className="text-white font-medium text-sm block mb-1.5 truncate"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {player.name}
                    </span>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${metMinimum ? "bg-[#a3e635]" : "bg-red-500"}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.7, delay: i * 0.07 + 0.3, ease: "easeOut" }}
                      />
                    </div>
                  </div>

                  {/* 1st half */}
                  <div className="w-10 text-center shrink-0">
                    <span
                      className={`text-xs font-semibold tabular-nums ${
                        playedFirst ? "text-[#a3e635]" : "text-red-400"
                      }`}
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {playedFirst ? `${Math.round(player.firstHalfMinutes)}m` : "✗"}
                    </span>
                  </div>

                  {/* 2nd half */}
                  <div className="w-10 text-center shrink-0">
                    <span
                      className={`text-xs font-semibold tabular-nums ${
                        playedSecond ? "text-[#a3e635]" : "text-red-400"
                      }`}
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {playedSecond ? `${Math.round(player.secondHalfMinutes)}m` : "✗"}
                    </span>
                  </div>

                  {/* Total time */}
                  <div className="w-14 text-right shrink-0">
                    <span
                      className={`text-sm font-bold tabular-nums ${
                        metMinimum ? "text-[#a3e635]" : "text-red-400"
                      }`}
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {formatMinSec(player.minutesPlayed)}
                    </span>
                  </div>

                  {/* Status icon */}
                  <div className="w-5 shrink-0">
                    {allOk ? (
                      <CheckCircle2 size={16} className="text-[#a3e635]" />
                    ) : (
                      <XCircle size={16} className="text-red-400" />
                    )}
                  </div>
                </div>

                {/* Issue notes */}
                {(!metMinimum || !playedFirst || !playedSecond) && (
                  <div className="px-4 pb-2.5 -mt-1 flex flex-col gap-0.5">
                    {!playedFirst && (
                      <span
                        className="text-red-400/70 text-xs"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        Less than {MIN_HALF_MINUTES} min in the 1st half
                      </span>
                    )}
                    {!playedSecond && (
                      <span
                        className="text-red-400/70 text-xs"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        Less than {MIN_HALF_MINUTES} min in the 2nd half
                      </span>
                    )}
                    {!metMinimum && (
                      <span
                        className="text-red-400/60 text-xs"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        {formatMinSec(MIN_TOTAL_MINUTES - player.minutesPlayed)} short of {MIN_TOTAL_MINUTES}-min minimum
                      </span>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Footer stat */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center justify-center gap-2 mt-3 text-white/30 text-xs"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          <Clock size={12} />
          <span>Total team minutes: {formatMinSec(totalPlayed)}</span>
        </motion.div>
      </div>

      {/* New Game button */}
      <div className="px-4 pb-10 mt-auto pt-4">
        <Button
          onClick={reset}
          className="w-full h-14 rounded-2xl bg-[#a3e635] hover:bg-[#84cc16] text-[#0d1117] font-bold text-base shadow-lg shadow-[#a3e635]/15"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          <RotateCcw size={18} className="mr-2" />
          New Game
        </Button>
      </div>
    </div>
  );
}
