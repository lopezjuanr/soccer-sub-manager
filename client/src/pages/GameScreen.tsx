/**
 * GameScreen — Live game view with timer, player status, and sub recommendations
 * Design: Clean Coach's App — near-black bg, electric lime accents, urgency-coded cards
 */

import { useState } from "react";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useGame } from "@/contexts/GameContext";
import { effectiveMinutes, effectiveHalfMinutes, playerUrgency, UrgencyLevel, SUB_WINDOWS, MIN_TOTAL_MINUTES, halfCounts } from "@/lib/gameEngine";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeftRight,
  Flag,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  FastForward,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function UrgencyDot({ level }: { level: UrgencyLevel }) {
  const colors: Record<UrgencyLevel, string> = {
    ok: "bg-[#a3e635]",
    caution: "bg-amber-400",
    "low-time": "bg-amber-400",
    urgent: "bg-red-500",
    critical: "bg-red-600",
  };
  const pulse = level === "urgent" || level === "critical";
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${colors[level]} ${
        pulse ? "animate-pulse" : ""
      }`}
    />
  );
}

function PlayerCard({
  player,
  elapsedSeconds,
  totalMinutes,
  isRecommendedOut,
  isRecommendedIn,
}: {
  player: ReturnType<typeof useGame>["state"]["players"][0];
  elapsedSeconds: number;
  totalMinutes: number;
  isRecommendedOut?: boolean;
  isRecommendedIn?: boolean;
}) {
  const elapsedMin = elapsedSeconds / 60;
  const settings = { totalMinutes, fieldSize: 4 };
  const { first: firstMin, second: secondMin, total: current } = effectiveHalfMinutes(player, elapsedMin, settings);
  const pct = Math.min(100, (current / MIN_TOTAL_MINUTES) * 100);
  // completedWindows not available here — pass empty array; urgency is approximate in card view
  const urgency = playerUrgency(player, elapsedMin, settings, []);

  const urgencyColors: Record<UrgencyLevel, { bar: string; text: string; border: string }> = {
    ok: { bar: "bg-[#a3e635]", text: "text-[#a3e635]", border: "border-[#a3e635]/30" },
    caution: { bar: "bg-amber-400", text: "text-amber-400", border: "border-amber-400/30" },
    "low-time": { bar: "bg-amber-400", text: "text-amber-400", border: "border-amber-400/30" },
    urgent: { bar: "bg-red-500", text: "text-red-400", border: "border-red-500/30" },
    critical: { bar: "bg-red-600", text: "text-red-300", border: "border-red-600/50" },
  };
  const colors = urgencyColors[urgency];
  const half = elapsedMin < totalMinutes / 2 ? 1 : 2;

  return (
    <motion.div
      layout
      className={[
        "relative rounded-xl p-2.5 border transition-all",
        player.status === "on" ? `bg-white/8 ${colors.border} border` : "bg-white/4 border-white/8 border",
        isRecommendedOut ? "ring-2 ring-red-500/60" : "",
        isRecommendedIn ? "ring-2 ring-[#a3e635]/60" : "",
      ].join(" ")}
    >
      {/* Status badge */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <UrgencyDot level={urgency} />
          <span
            className="text-white font-semibold text-base"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {player.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isRecommendedOut && (
            <span className="text-[10px] font-bold text-red-400 bg-red-500/15 px-2 py-0.5 rounded-full">
              SUB OUT
            </span>
          )}
          {isRecommendedIn && (
            <span className="text-[10px] font-bold text-[#a3e635] bg-[#a3e635]/15 px-2 py-0.5 rounded-full">
              SUB IN
            </span>
          )}
          <span
            className={`text-xs font-bold tabular-nums ${colors.text}`}
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {current.toFixed(1)}<span className="text-white/40 font-normal text-[10px] ml-0.5">m</span>
          </span>
        </div>
      </div>

      {/* Per-half mini indicators */}
      <div className="flex gap-2 mb-1.5">
        <div className={`flex-1 flex items-center gap-1.5 rounded-lg px-2 py-0.5 ${
          halfCounts(firstMin) ? "bg-[#a3e635]/10" : half === 1 ? "bg-red-500/10" : "bg-white/5"
        }`}>
          <span className={`text-[9px] font-bold uppercase tracking-wider ${
            halfCounts(firstMin) ? "text-[#a3e635]/70" : half === 1 ? "text-red-400/80" : "text-white/25"
          }`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>1st</span>
          <span className={`text-xs font-semibold tabular-nums ${
            halfCounts(firstMin) ? "text-[#a3e635]" : firstMin > 0 ? "text-amber-400" : half === 1 ? "text-red-400" : "text-white/25"
          }`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {firstMin > 0 ? `${firstMin.toFixed(0)}m` : "—"}
          </span>
        </div>
        <div className={`flex-1 flex items-center gap-1.5 rounded-lg px-2 py-0.5 ${
          halfCounts(secondMin) ? "bg-[#a3e635]/10" : half === 2 ? "bg-red-500/10" : "bg-white/5"
        }`}>
          <span className={`text-[9px] font-bold uppercase tracking-wider ${
            halfCounts(secondMin) ? "text-[#a3e635]/70" : half === 2 ? "text-red-400/80" : "text-white/25"
          }`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>2nd</span>
          <span className={`text-xs font-semibold tabular-nums ${
            halfCounts(secondMin) ? "text-[#a3e635]" : secondMin > 0 ? "text-amber-400" : half === 2 ? "text-red-400" : "text-white/25"
          }`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {secondMin > 0 ? `${secondMin.toFixed(0)}m` : "—"}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-white/10 rounded-full overflow-hidden mt-1">
        <motion.div
          className={`h-full rounded-full ${colors.bar}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </motion.div>
  );
}

export default function GameScreen() {
  const {
    state,
    elapsedMinutes,
    dispatch,
    applySubstitution,
    completeSubWindow,
    dismissSubWindow,
    skipToNextWindow,
    endGame,
  } = useGame();

  const [manualSubOpen, setManualSubOpen] = useState(false);
  const [selectedOut, setSelectedOut] = useState<Set<string>>(new Set());
  const [selectedIn, setSelectedIn] = useState<Set<string>>(new Set());
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  // Track which recommendation pairs have been applied in the current dialog
  const [appliedRecs, setAppliedRecs] = useState<Set<string>>(new Set());

  const { players, settings, elapsedSeconds, isRunning, subDialogOpen, pendingRecs, completedWindows, activeWindow } = state;

  // Keep the screen awake for the entire game session
  useWakeLock(state.screen === "game");

  const onField = players.filter((p) => p.status === "on");
  const bench = players.filter((p) => p.status === "off");
  const totalSec = settings.totalMinutes * 60;
  const gameProgressPct = Math.min(100, (elapsedSeconds / totalSec) * 100);

  // Find next sub window
  const nextWindow = SUB_WINDOWS.find((w) => !completedWindows.includes(w.id));
  const nextWindowSec = nextWindow ? nextWindow.fraction * totalSec : null;
  const secToNext = nextWindowSec !== null ? Math.max(0, nextWindowSec - elapsedSeconds) : null;

  const recOutIds = new Set(pendingRecs.map((r) => r.playerOut.id));
  const recInIds = new Set(pendingRecs.map((r) => r.playerIn.id));

  // Progress through sub windows
  const windowProgress = SUB_WINDOWS.map((w) => ({
    ...w,
    done: completedWindows.includes(w.id),
    active: activeWindow === w.id,
  }));

  function handleManualSub() {
    if (selectedOut.size === 0 || selectedIn.size === 0) {
      toast.error("Select at least one player out and one player in");
      return;
    }
    if (selectedOut.size !== selectedIn.size) {
      toast.error(`Select the same number of players out and in (${selectedOut.size} out, ${selectedIn.size} in)`);
      return;
    }
    const outIds = Array.from(selectedOut);
    const inIds = Array.from(selectedIn);
    outIds.forEach((outId, i) => applySubstitution(outId, inIds[i]));
    setSelectedOut(new Set());
    setSelectedIn(new Set());
    setManualSubOpen(false);
    toast.success(`${outIds.length} substitution${outIds.length > 1 ? "s" : ""} applied`);
  }

  function handleApplyRec(outId: string, inId: string) {
    applySubstitution(outId, inId);
    setAppliedRecs((prev) => new Set(prev).add(`${outId}-${inId}`));
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col">
      {/* Header */}
      <div className="bg-[#0d1117] border-b border-white/8 px-4 py-3 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-white font-bold text-lg leading-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              ⚽ Game Live
            </h1>
            <div className="flex items-center gap-3 mt-0.5">
              {windowProgress.map((w) => (
                <div key={w.id} className="flex items-center gap-1">
                  {w.done ? (
                    <CheckCircle2 size={12} className="text-[#a3e635]" />
                  ) : (
                    <div className={`w-2 h-2 rounded-full ${w.active ? "bg-amber-400 animate-pulse" : "bg-white/20"}`} />
                  )}
                  <span className="text-[10px] text-white/40" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {w.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Clock */}
          <div className="text-right">
            <div
              className="text-3xl font-bold tabular-nums text-white"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {formatTime(elapsedSeconds)}
            </div>
            <div className="text-xs text-white/40" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              / {settings.totalMinutes}:00
            </div>
          </div>
        </div>

        {/* Game progress bar */}
        <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#a3e635] rounded-full"
            style={{ width: `${gameProgressPct}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        {secToNext !== null && secToNext > 0 && (
          <p className="text-white/30 text-xs mt-1 text-right" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Next sub in {formatTime(secToNext)}
          </p>
        )}

        {/* Timer controls */}
        <div className="flex gap-2 mt-3">
          <Button
            onClick={() => setManualSubOpen(true)}
            className="flex-1 h-10 rounded-xl bg-white/8 hover:bg-white/15 text-white text-sm font-semibold"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <ArrowLeftRight size={16} className="mr-1.5" />
            Sub
          </Button>
          <Button
            onClick={skipToNextWindow}
            title="Demo: skip to next sub window"
            className="h-10 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 text-sm font-semibold border border-amber-500/20"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <FastForward size={15} />
          </Button>
          <Button
            onClick={() => setEndConfirmOpen(true)}
            className="h-10 px-4 rounded-xl bg-white/8 hover:bg-red-500/20 text-white/60 hover:text-red-400 text-sm"
          >
            <Flag size={16} />
          </Button>
        </div>
      </div>

      {/* Player cards */}
      <div className="flex-1 px-4 pt-4 pb-6 space-y-5 overflow-y-auto">
        {/* On Field */}
        <section>
          <h2
            className="text-[#a3e635] text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#a3e635] animate-pulse" />
            On Field ({onField.length}/4)
          </h2>
          <div className="space-y-2">
            {onField.map((p) => (
              <PlayerCard
                key={p.id}
                player={p}
                elapsedSeconds={elapsedSeconds}
                totalMinutes={settings.totalMinutes}
                isRecommendedOut={recOutIds.has(p.id)}
              />
            ))}
          </div>
        </section>

        {/* Bench */}
        {bench.length > 0 && (
          <section>
            <h2
              className="text-white/40 text-xs font-bold uppercase tracking-widest mb-3"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Bench ({bench.length})
            </h2>
            <div className="space-y-2">
              {bench.map((p) => (
                <PlayerCard
                  key={p.id}
                  player={p}
                  elapsedSeconds={elapsedSeconds}
                  totalMinutes={settings.totalMinutes}
                  isRecommendedIn={recInIds.has(p.id)}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── Sub Window Dialog ── */}
      <Dialog open={subDialogOpen} onOpenChange={(open) => { if (!open) dismissSubWindow(); }}>
        <DialogContent className="bg-[#161b22] border-white/10 text-white max-w-sm mx-auto rounded-2xl p-0 overflow-hidden">
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-5 py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-400" />
                <DialogTitle
                  className="text-white font-bold text-lg"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {SUB_WINDOWS.find((w) => w.id === activeWindow)?.label ?? "Substitution Time"}
                </DialogTitle>
              </div>
              <button
                onClick={dismissSubWindow}
                className="w-8 h-8 rounded-lg border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:border-white/40 transition-colors shrink-0"
                aria-label="Close and make manual substitution"
              >
                ✕
              </button>
            </div>
            <p className="text-white/50 text-sm mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Recommended substitutions to ensure fair play time
            </p>
          </div>

          <div className="px-5 py-4 space-y-4">
            {pendingRecs.length === 0 ? (
              <div className="text-center py-4">
                <CheckCircle2 size={32} className="text-[#a3e635] mx-auto mb-2" />
                <p className="text-white font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  All players on track!
                </p>
                <p className="text-white/50 text-sm mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  No substitutions needed right now.
                </p>
              </div>
            ) : (
              <>
                {/* Coming OUT section */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                    <span
                      className="text-red-400 text-xs font-bold uppercase tracking-widest"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      Coming Out
                    </span>
                  </div>
                  <div className="bg-red-500/8 border border-red-500/15 rounded-xl px-4 py-3 space-y-2">
                    {pendingRecs.map((rec, i) => (
                      <motion.div
                        key={`out-${i}`}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.07 }}
                        className="flex items-center gap-3"
                      >
                        <span
                          className="w-6 h-6 rounded-md bg-red-500/15 text-red-400 text-xs font-bold flex items-center justify-center shrink-0"
                          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          {i + 1}
                        </span>
                        <span
                          className="text-white font-semibold text-base"
                          style={{ fontFamily: "'DM Sans', sans-serif" }}
                        >
                          {rec.playerOut.name}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Coming IN section */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#a3e635] shrink-0" />
                    <span
                      className="text-[#a3e635] text-xs font-bold uppercase tracking-widest"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      Coming In
                    </span>
                  </div>
                  <div className="bg-[#a3e635]/8 border border-[#a3e635]/15 rounded-xl px-4 py-3 space-y-2">
                    {pendingRecs.map((rec, i) => (
                      <motion.div
                        key={`in-${i}`}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.07 + 0.1 }}
                        className="flex items-center gap-3"
                      >
                        <span
                          className="w-6 h-6 rounded-md bg-[#a3e635]/15 text-[#a3e635] text-xs font-bold flex items-center justify-center shrink-0"
                          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          {i + 1}
                        </span>
                        <span
                          className="text-white font-semibold text-base"
                          style={{ fontFamily: "'DM Sans', sans-serif" }}
                        >
                          {rec.playerIn.name}
                        </span>
                        <span
                          className="text-white/35 text-xs ml-auto"
                          style={{ fontFamily: "'DM Sans', sans-serif" }}
                        >
                          {rec.reason}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="px-5 pb-5">
            <Button
              onClick={() => {
                // Apply all recommendations at once
                pendingRecs.forEach((rec) => {
                  applySubstitution(rec.playerOut.id, rec.playerIn.id);
                });
                setAppliedRecs(new Set());
                completeSubWindow();
              }}
              className="w-full h-12 rounded-xl bg-[#a3e635] hover:bg-[#84cc16] text-[#0d1117] font-bold"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              <CheckCircle2 size={16} className="mr-2" />
              Apply All — Resume Game
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Manual Sub Dialog ── */}
      <Dialog open={manualSubOpen} onOpenChange={setManualSubOpen}>
        <DialogContent className="bg-[#161b22] border-white/10 text-white max-w-sm mx-auto rounded-2xl p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-0">
            <DialogTitle
              className="text-white font-bold text-lg"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Manual Substitution
            </DialogTitle>
            <p className="text-white/50 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Tap to select — counts must match
            </p>
          </DialogHeader>

          <div className="px-5 py-4 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                <p className="text-red-400 text-xs font-bold uppercase tracking-widest" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Coming Out
                </p>
              </div>
              <div className="space-y-1.5">
                {onField.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedOut((prev) => {
                      const next = new Set(prev);
                      if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
                      return next;
                    })}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                      selectedOut.has(p.id)
                        ? "bg-red-500/20 border-red-500/50 text-white"
                        : "bg-white/5 border-white/8 text-white/70 hover:bg-white/10"
                    }`}
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <span className="flex items-center justify-between">
                      <span>{p.name}<span className="text-xs text-white/40 ml-2">{effectiveMinutes(p, elapsedMinutes).toFixed(1)} min</span></span>
                      {selectedOut.has(p.id) && <span className="text-[10px] font-bold text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full">OUT</span>}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#a3e635] shrink-0" />
                <p className="text-[#a3e635] text-xs font-bold uppercase tracking-widest" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Coming In
                </p>
              </div>
              <div className="space-y-1.5">
                {bench.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedIn((prev) => {
                      const next = new Set(prev);
                      if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
                      return next;
                    })}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                      selectedIn.has(p.id)
                        ? "bg-[#a3e635]/20 border-[#a3e635]/50 text-white"
                        : "bg-white/5 border-white/8 text-white/70 hover:bg-white/10"
                    }`}
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <span className="flex items-center justify-between">
                      <span>{p.name}<span className="text-xs text-white/40 ml-2">{effectiveMinutes(p, elapsedMinutes).toFixed(1)} min</span></span>
                      {selectedIn.has(p.id) && <span className="text-[10px] font-bold text-[#a3e635] bg-[#a3e635]/20 px-2 py-0.5 rounded-full">IN</span>}
                    </span>
                  </button>
                ))}
                {bench.length === 0 && (
                  <p className="text-white/30 text-sm text-center py-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    No bench players
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Count indicator */}
          {(selectedOut.size > 0 || selectedIn.size > 0) && (
            <div className="px-5 pb-2 flex items-center justify-center gap-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                selectedOut.size > 0 ? "bg-red-500/20 text-red-400" : "bg-white/8 text-white/30"
              }`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {selectedOut.size} OUT
              </span>
              <span className="text-white/30 text-xs">=</span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                selectedIn.size > 0 ? "bg-[#a3e635]/20 text-[#a3e635]" : "bg-white/8 text-white/30"
              }`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {selectedIn.size} IN
              </span>
              {selectedOut.size !== selectedIn.size && selectedOut.size > 0 && selectedIn.size > 0 && (
                <span className="text-amber-400 text-xs" style={{ fontFamily: "'DM Sans', sans-serif" }}>— counts must match</span>
              )}
            </div>
          )}
          <div className="px-5 pb-5 flex gap-2">
            <Button
              onClick={() => { setManualSubOpen(false); setSelectedOut(new Set()); setSelectedIn(new Set()); }}
              className="flex-1 h-11 rounded-xl bg-white/8 hover:bg-white/15 text-white"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleManualSub}
              disabled={selectedOut.size === 0 || selectedIn.size === 0 || selectedOut.size !== selectedIn.size}
              className="flex-1 h-11 rounded-xl bg-[#a3e635] hover:bg-[#84cc16] text-[#0d1117] font-bold disabled:opacity-40"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Confirm Sub
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── End Game Confirm ── */}
      <Dialog open={endConfirmOpen} onOpenChange={setEndConfirmOpen}>
        <DialogContent className="bg-[#161b22] border-white/10 text-white max-w-sm mx-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle
              className="text-white font-bold text-lg"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              End the Game?
            </DialogTitle>
          </DialogHeader>
          <p className="text-white/50 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            This will stop the clock and show the final summary.
          </p>
          <div className="flex gap-2 mt-2">
            <Button
              onClick={() => setEndConfirmOpen(false)}
              className="flex-1 h-11 rounded-xl bg-white/8 hover:bg-white/15 text-white"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Keep Playing
            </Button>
            <Button
              onClick={() => { setEndConfirmOpen(false); endGame(); }}
              className="flex-1 h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              End Game
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
