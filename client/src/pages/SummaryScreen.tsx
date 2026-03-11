/**
 * SummaryScreen — Post-game fair play summary
 * Design: Clean Coach's App — near-black bg, electric lime accents, Space Grotesk + DM Sans
 */

import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, RotateCcw, Trophy } from "lucide-react";
import { motion } from "framer-motion";

export default function SummaryScreen() {
  const { state, reset } = useGame();
  const { players, settings } = state;
  const required = settings.totalMinutes / 2;

  const sorted = [...players].sort((a, b) => b.minutesPlayed - a.minutesPlayed);
  const allMet = sorted.every((p) => p.minutesPlayed >= required);

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col">
      {/* Header */}
      <div className="px-4 pt-10 pb-6 text-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="w-16 h-16 rounded-2xl bg-[#a3e635]/15 flex items-center justify-center mx-auto mb-4"
        >
          <Trophy size={32} className="text-[#a3e635]" />
        </motion.div>
        <h1
          className="text-white font-bold text-2xl"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Game Over
        </h1>
        <p
          className="text-white/50 text-sm mt-1"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {settings.totalMinutes}-minute game · {players.length} players
        </p>
        <div
          className={`inline-flex items-center gap-2 mt-3 px-4 py-1.5 rounded-full text-sm font-semibold ${
            allMet
              ? "bg-[#a3e635]/15 text-[#a3e635]"
              : "bg-red-500/15 text-red-400"
          }`}
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {allMet ? (
            <><CheckCircle2 size={14} /> All players met fair play requirement</>
          ) : (
            <><XCircle size={14} /> Some players didn't reach minimum time</>
          )}
        </div>
      </div>

      {/* Player results */}
      <div className="px-4 space-y-3 pb-8">
        <p
          className="text-white/40 text-xs uppercase tracking-widest mb-1"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Player Summary
        </p>
        {sorted.map((player, i) => {
          const met = player.minutesPlayed >= required;
          const pct = Math.min(100, (player.minutesPlayed / required) * 100);
          return (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07 }}
              className={`rounded-2xl p-4 border ${
                met
                  ? "bg-[#a3e635]/5 border-[#a3e635]/20"
                  : "bg-red-500/5 border-red-500/20"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-white font-semibold"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {player.name}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xl font-bold tabular-nums ${
                      met ? "text-[#a3e635]" : "text-red-400"
                    }`}
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {player.minutesPlayed.toFixed(1)}
                    <span className="text-sm font-normal text-white/40 ml-1">
                      min
                    </span>
                  </span>
                  {met ? (
                    <CheckCircle2 size={18} className="text-[#a3e635]" />
                  ) : (
                    <XCircle size={18} className="text-red-400" />
                  )}
                </div>
              </div>

              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${
                    met ? "bg-[#a3e635]" : "bg-red-500"
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, delay: i * 0.07 + 0.2 }}
                />
              </div>

              {!met && (
                <p
                  className="text-red-400/70 text-xs mt-1.5"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {(required - player.minutesPlayed).toFixed(1)} min short of
                  the {required}-min requirement
                </p>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Reset button */}
      <div className="px-4 pb-10 mt-auto">
        <Button
          onClick={reset}
          className="w-full h-14 rounded-2xl bg-[#a3e635] hover:bg-[#84cc16] text-[#0d1117] font-bold text-base"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          <RotateCcw size={18} className="mr-2" />
          New Game
        </Button>
      </div>
    </div>
  );
}
