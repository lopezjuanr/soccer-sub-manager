/**
 * GameScreen — Live game view with timer, player status, and sub recommendations
 * Design: Clean Coach's App — near-black bg, electric lime accents, urgency-coded cards
 *
 * Halftime rule:
 * - When atHalftime is true, the clock is stopped and a halftime banner is shown.
 * - The coach MUST make a substitution to restart the clock.
 * - Clicking "Sub" opens the manual sub dialog.
 * - Clicking "Confirm Sub" calls confirmHalftimeSub() which applies the sub AND restarts the clock.
 * - No other action restarts the clock.
 */

import { useState } from "react";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useGame } from "@/contexts/GameContext";
import {
  effectiveMinutes,
  effectiveHalfMinutes,
  playerUrgency,
  UrgencyLevel,
  SUB_WINDOWS,
  MIN_TOTAL_MINUTES,
  halfCounts,
} from "@/lib/gameEngine";
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
  CheckCircle2,
  AlertTriangle,
  FastForward,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
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
  fieldSize,
  targetMinutes,
  isRecommendedOut,
  isRecommendedIn,
}: {
  player: ReturnType<typeof useGame>["state"]["players"][0];
  elapsedSeconds: number;
  totalMinutes: number;
  fieldSize: number;
  targetMinutes: number;
  isRecommendedOut?: boolean;
  isRecommendedIn?: boolean;
}) {
  const elapsedMin = elapsedSeconds / 60;
  const settings = { totalMinutes, fieldSize };
  const { total: current } = effectiveHalfMinutes(player, elapsedMin, settings);
  const pct = Math.min(100, (current / targetMinutes) * 100);
  const urgency = playerUrgency(player, elapsedMin, settings, []);

  const urgencyColors: Record<UrgencyLevel, { bar: string; text: string; border: string }> = {
    ok: { bar: "bg-[#a3e635]", text: "text-[#a3e635]", border: "border-[#a3e635]/30" },
    caution: { bar: "bg-amber-400", text: "text-amber-400", border: "border-amber-400/30" },
    "low-time": { bar: "bg-amber-400", text: "text-amber-400", border: "border-amber-400/30" },
    urgent: { bar: "bg-red-500", text: "text-red-400", border: "border-red-500/30" },
    critical: { bar: "bg-red-600", text: "text-red-300", border: "border-red-600/50" },
  };
  const colors = urgencyColors[urgency];

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
            className={`text-lg font-bold tabular-nums ${colors.text}`}
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {current.toFixed(0)}<span className="text-white/40 font-normal text-xs ml-0.5">m</span>
          </span>
        </div>
      </div>

      <div className="h-0.5 bg-white/10 rounded-full overflow-hidden mt-1">
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
    confirmHalftimeSub,
    completeSubWindow,
    dismissSubWindow,
    skipToNextWindow,
    endGame,
    incrementScore,
    decrementScore,
  } = useGame();

  const [manualSubOpen, setManualSubOpen] = useState(false);
  const [selectedOut, setSelectedOut] = useState<Set<string>>(new Set());
  const [selectedIn, setSelectedIn] = useState<Set<string>>(new Set());
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);

  const {
    players,
    settings,
    elapsedSeconds,
    isRunning,
    subDialogOpen,
    pendingRecs,
    completedWindows,
    activeWindow,
    atHalftime,
    scoreUs,
    scoreThem,
  } = state;

  // Keep the screen awake for the entire game session
  useWakeLock(state.screen === "game");

  const onField = players.filter((p) => p.status === "on");
  const bench = players.filter((p) => p.status === "off");
  const totalSec = settings.totalMinutes * 60;

  // Target playing time: proportional to game length and roster size
  // Each player should get roughly equal time: (totalMinutes * fieldSize) / totalPlayers
  const totalPlayers = players.length;
  const targetMinutes = totalPlayers > 0
    ? Math.round((settings.totalMinutes * settings.fieldSize) / totalPlayers)
    : MIN_TOTAL_MINUTES;
  const gameProgressPct = Math.min(100, (elapsedSeconds / totalSec) * 100);

  const recOutIds = new Set(pendingRecs.map((r) => r.playerOut.id));
  const recInIds = new Set(pendingRecs.map((r) => r.playerIn.id));

  const windowProgress = SUB_WINDOWS.map((w) => ({
    ...w,
    done: completedWindows.includes(w.id),
    active: activeWindow === w.id,
  }));

  /**
   * Called when the coach clicks "Confirm Sub" in the manual sub dialog.
   * If we are at halftime, this also restarts the clock.
   * Otherwise it just applies the substitution normally.
   */
  function handleManualSub() {
    if (selectedOut.size === 0 || selectedIn.size === 0) {
      toast.error("Select at least one player out and one player in");
      return;
    }
    if (selectedOut.size !== selectedIn.size) {
      toast.error(
        `Select the same number of players out and in (${selectedOut.size} out, ${selectedIn.size} in)`
      );
      return;
    }

    const outIds = Array.from(selectedOut);
    const inIds = Array.from(selectedIn);

    if (atHalftime) {
      // Halftime path: apply subs AND restart the clock
      confirmHalftimeSub(outIds, inIds);
    } else {
      // Normal path: just apply subs
      outIds.forEach((outId, i) => applySubstitution(outId, inIds[i]));
    }

    setSelectedOut(new Set());
    setSelectedIn(new Set());
    setManualSubOpen(false);
    toast.success(`${outIds.length} substitution${outIds.length > 1 ? "s" : ""} applied`);
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
              ⚽ {atHalftime ? "Half Time" : "Game Live"}
            </h1>
            <div className="flex items-center gap-3 mt-0.5">
              {windowProgress.map((w) => (
                <div key={w.id} className="flex items-center gap-1">
                  {w.done ? (
                    <CheckCircle2 size={12} className="text-[#a3e635]" />
                  ) : (
                    <div
                      className={`w-2 h-2 rounded-full ${
                        w.active ? "bg-amber-400 animate-pulse" : "bg-white/20"
                      }`}
                    />
                  )}
                  <span
                    className="text-[10px] text-white/40"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {w.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Clock */}
          <div className="text-right">
            <div
              className={`text-3xl font-bold tabular-nums ${
                atHalftime ? "text-amber-400" : "text-white"
              }`}
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {formatTime(elapsedSeconds)}
            </div>
            <div
              className="text-xs text-white/40"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              / {settings.totalMinutes}:00
            </div>
          </div>
        </div>

        {/* Score widget */}
        <div className="flex items-center justify-center gap-0 mt-3 mb-1">
          {/* US */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold tracking-widest text-white/40 uppercase mb-0.5"
              style={{ fontFamily: "'DM Sans', sans-serif" }}>Us</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => decrementScore("us")}
                className="w-6 h-6 rounded-full bg-white/8 hover:bg-white/15 text-white/50 hover:text-white text-sm font-bold leading-none transition-colors"
                aria-label="Decrease our score"
              >−</button>
              <button
                onClick={() => incrementScore("us")}
                className="w-14 h-14 rounded-2xl bg-white/8 hover:bg-[#a3e635]/20 active:scale-95 transition-all text-white font-bold text-4xl tabular-nums"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                aria-label="Increase our score"
              >{scoreUs}</button>
            </div>
          </div>

          {/* Divider */}
          <span className="text-white/25 text-3xl font-light mx-3 mt-4">—</span>

          {/* THEM */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold tracking-widest text-white/40 uppercase mb-0.5"
              style={{ fontFamily: "'DM Sans', sans-serif" }}>Them</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => incrementScore("them")}
                className="w-14 h-14 rounded-2xl bg-white/8 hover:bg-red-500/20 active:scale-95 transition-all text-white font-bold text-4xl tabular-nums"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                aria-label="Increase their score"
              >{scoreThem}</button>
              <button
                onClick={() => decrementScore("them")}
                className="w-6 h-6 rounded-full bg-white/8 hover:bg-white/15 text-white/50 hover:text-white text-sm font-bold leading-none transition-colors"
                aria-label="Decrease their score"
              >−</button>
            </div>
          </div>
        </div>

        {/* Game progress bar */}
        <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${atHalftime ? "bg-amber-400" : "bg-[#a3e635]"}`}
            style={{ width: `${gameProgressPct}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Timer controls */}
        <div className="flex gap-2 mt-3">
          <Button
            onClick={() => {
              setSelectedOut(new Set());
              setSelectedIn(new Set());
              setManualSubOpen(true);
            }}
            className={`flex-1 h-10 rounded-xl text-sm font-semibold ${
              atHalftime
                ? "bg-amber-500 hover:bg-amber-400 text-[#0d1117]"
                : "bg-white/8 hover:bg-white/15 text-white"
            }`}
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <ArrowLeftRight size={16} className="mr-1.5" />
            {atHalftime ? "Make Sub to Resume" : "Sub"}
          </Button>
          <Button
            onClick={skipToNextWindow}
            title="Demo: skip to halftime"
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

      {/* ── Halftime Banner ── */}
      <AnimatePresence>
        {atHalftime && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="mx-4 mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                <Clock size={18} className="text-amber-400" />
              </div>
              <div>
                <p
                  className="text-amber-300 font-bold text-base leading-tight"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Half Time — Clock Stopped
                </p>
                <p
                  className="text-amber-400/60 text-xs mt-0.5"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Make a substitution to start the second half
                </p>
              </div>
            </div>
            <Button
              onClick={() => {
                setSelectedOut(new Set());
                setSelectedIn(new Set());
                setManualSubOpen(true);
              }}
              className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0d1117] font-bold text-sm mt-1"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              <ArrowLeftRight size={16} className="mr-2" />
              Make Substitution
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Player cards */}
      <div className="flex-1 px-4 pt-4 pb-6 space-y-5 overflow-y-auto">
        {/* On Field */}
        <section>
          <h2
            className="text-[#a3e635] text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#a3e635] animate-pulse" />
            On Field ({onField.length}/{settings.fieldSize})
          </h2>
          <div className="space-y-2">
            {onField.map((p) => (
              <PlayerCard
                key={p.id}
                player={p}
                elapsedSeconds={elapsedSeconds}
                totalMinutes={settings.totalMinutes}
                fieldSize={settings.fieldSize}
                targetMinutes={targetMinutes}
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
                fieldSize={settings.fieldSize}
                targetMinutes={targetMinutes}
                isRecommendedIn={recInIds.has(p.id)}
              />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── Manual Sub Dialog ── */}
      <Dialog
        open={manualSubOpen}
        onOpenChange={(open) => {
          // If closing while at halftime, do NOT restart the clock — just close
          if (!open) {
            setSelectedOut(new Set());
            setSelectedIn(new Set());
          }
          setManualSubOpen(open);
        }}
      >
        <DialogContent className="bg-[#161b22] border-white/10 text-white max-w-sm mx-auto rounded-2xl p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-0">
            <DialogTitle
              className="text-white font-bold text-lg"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {atHalftime ? "Half Time Substitution" : "Manual Substitution"}
            </DialogTitle>
            <p className="text-white/50 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {atHalftime
                ? "Confirm a sub to start the 2nd half"
                : "Tap to select — counts must match"}
            </p>
          </DialogHeader>

          <div className="px-5 py-4 space-y-4">
            {/* Player Out */}
            <div>
              <p
                className="text-red-400 text-xs font-bold uppercase tracking-widest mb-2"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Player Out (on field)
              </p>
              <div className="space-y-1.5">
                {onField.map((p) => {
                  const maxPlayTime = Math.max(
                    ...onField.map((pl) => effectiveMinutes(pl, elapsedMinutes))
                  );
                  const shouldComeOut =
                    effectiveMinutes(p, elapsedMinutes) === maxPlayTime;
                  return (
                    <button
                      key={p.id}
                      onClick={() =>
                        setSelectedOut((prev) => {
                          const next = new Set(prev);
                          if (next.has(p.id)) next.delete(p.id);
                          else next.add(p.id);
                          return next;
                        })
                      }
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                        selectedOut.has(p.id)
                          ? "bg-red-500/20 border-red-500/50 text-white"
                          : "bg-white/5 border-white/8 text-white/70 hover:bg-white/10"
                      }`}
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      <span className="flex items-center justify-between">
                        <span>
                          {p.name}
                          <span className="text-xs text-white/40 ml-2">
                            {effectiveMinutes(p, elapsedMinutes).toFixed(1)} min
                          </span>
                        </span>
                        <div className="flex items-center gap-1">
                          {shouldComeOut && (
                            <span className="text-xs font-bold text-red-400">🔴</span>
                          )}
                          {selectedOut.has(p.id) && (
                            <span className="text-[10px] font-bold text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full">
                              OUT
                            </span>
                          )}
                        </div>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Player In */}
            <div>
              <p
                className="text-[#a3e635] text-xs font-bold uppercase tracking-widest mb-2"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Player In (bench)
              </p>
              <div className="space-y-1.5">
                {bench.map((p) => {
                  const minPlayTime = Math.min(
                    ...bench.map((pl) => effectiveMinutes(pl, elapsedMinutes))
                  );
                  const shouldComeIn =
                    effectiveMinutes(p, elapsedMinutes) === minPlayTime;
                  return (
                    <button
                      key={p.id}
                      onClick={() =>
                        setSelectedIn((prev) => {
                          const next = new Set(prev);
                          if (next.has(p.id)) next.delete(p.id);
                          else next.add(p.id);
                          return next;
                        })
                      }
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                        selectedIn.has(p.id)
                          ? "bg-[#a3e635]/20 border-[#a3e635]/50 text-white"
                          : "bg-white/5 border-white/8 text-white/70 hover:bg-white/10"
                      }`}
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      <span className="flex items-center justify-between">
                        <span>
                          {p.name}
                          <span className="text-xs text-white/40 ml-2">
                            {effectiveMinutes(p, elapsedMinutes).toFixed(1)} min
                          </span>
                        </span>
                        <div className="flex items-center gap-1">
                          {shouldComeIn && (
                            <span className="text-xs font-bold text-[#a3e635]">🟢</span>
                          )}
                          {selectedIn.has(p.id) && (
                            <span className="text-[10px] font-bold text-[#a3e635] bg-[#a3e635]/20 px-2 py-0.5 rounded-full">
                              IN
                            </span>
                          )}
                        </div>
                      </span>
                    </button>
                  );
                })}
                {bench.length === 0 && (
                  <p
                    className="text-white/30 text-sm text-center py-3"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    No bench players
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Count indicator */}
          {(selectedOut.size > 0 || selectedIn.size > 0) && (
            <div className="px-5 pb-2 flex items-center justify-center gap-2">
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  selectedOut.size > 0
                    ? "bg-red-500/20 text-red-400"
                    : "bg-white/8 text-white/30"
                }`}
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {selectedOut.size} OUT
              </span>
              <span className="text-white/30 text-xs">=</span>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  selectedIn.size > 0
                    ? "bg-[#a3e635]/20 text-[#a3e635]"
                    : "bg-white/8 text-white/30"
                }`}
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {selectedIn.size} IN
              </span>
              {selectedOut.size !== selectedIn.size &&
                selectedOut.size > 0 &&
                selectedIn.size > 0 && (
                  <span
                    className="text-amber-400 text-xs"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    — counts must match
                  </span>
                )}
            </div>
          )}

          <div className="px-5 pb-5 flex gap-2">
            <Button
              onClick={() => {
                setManualSubOpen(false);
                setSelectedOut(new Set());
                setSelectedIn(new Set());
              }}
              className="flex-1 h-11 rounded-xl bg-white/8 hover:bg-white/15 text-white"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleManualSub}
              disabled={
                selectedOut.size === 0 ||
                selectedIn.size === 0 ||
                selectedOut.size !== selectedIn.size
              }
              className={`flex-1 h-11 rounded-xl font-bold disabled:opacity-40 ${
                atHalftime
                  ? "bg-amber-500 hover:bg-amber-400 text-[#0d1117]"
                  : "bg-[#a3e635] hover:bg-[#84cc16] text-[#0d1117]"
              }`}
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {atHalftime ? "Confirm Sub — Start 2nd Half" : "Confirm Sub"}
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
              onClick={() => {
                setEndConfirmOpen(false);
                endGame();
              }}
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
