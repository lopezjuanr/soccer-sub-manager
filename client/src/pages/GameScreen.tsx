/**
 * GameScreen — Live game view with timer, player status, and sub recommendations
 * Design: Clean Coach's App — near-black bg, electric lime accents, urgency-coded cards
 */

import { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { effectiveMinutes, playerUrgency, SUB_WINDOWS } from "@/lib/gameEngine";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Pause,
  Play,
  ArrowLeftRight,
  Flag,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
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

function UrgencyDot({ level }: { level: "ok" | "caution" | "urgent" }) {
  const colors = {
    ok: "bg-[#a3e635]",
    caution: "bg-amber-400",
    urgent: "bg-red-500",
  };
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${colors[level]} ${
        level === "urgent" ? "animate-pulse" : ""
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
  const current = effectiveMinutes(player, elapsedMin);
  const required = totalMinutes / 2;
  const pct = Math.min(100, (current / required) * 100);
  const urgency = playerUrgency(player, elapsedMin, {
    totalMinutes,
    fieldSize: 4,
  });

  const urgencyColors = {
    ok: { bar: "bg-[#a3e635]", text: "text-[#a3e635]", border: "border-[#a3e635]/30" },
    caution: { bar: "bg-amber-400", text: "text-amber-400", border: "border-amber-400/30" },
    urgent: { bar: "bg-red-500", text: "text-red-400", border: "border-red-500/30" },
  };
  const colors = urgencyColors[urgency];

  return (
    <motion.div
      layout
      className={`relative rounded-2xl p-4 border transition-all ${
        player.status === "on"
          ? `bg-white/8 ${colors.border} border`
          : "bg-white/4 border-white/8 border"
      } ${isRecommendedOut ? "ring-2 ring-red-500/60" : ""} ${
        isRecommendedIn ? "ring-2 ring-[#a3e635]/60" : ""
      }`}
    >
      {/* Status badge */}
      <div className="flex items-center justify-between mb-3">
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
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              player.status === "on"
                ? "bg-[#a3e635]/15 text-[#a3e635]"
                : "bg-white/10 text-white/40"
            }`}
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {player.status === "on" ? "ON FIELD" : "BENCH"}
          </span>
        </div>
      </div>

      {/* Time played */}
      <div className="flex items-end justify-between mb-2">
        <span
          className={`text-2xl font-bold tabular-nums ${colors.text}`}
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {current.toFixed(1)}
          <span className="text-sm font-normal text-white/40 ml-1">min</span>
        </span>
        <span
          className="text-xs text-white/40"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          need {required}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
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
    endGame,
  } = useGame();

  const [manualSubOpen, setManualSubOpen] = useState(false);
  const [selectedOut, setSelectedOut] = useState<string | null>(null);
  const [selectedIn, setSelectedIn] = useState<string | null>(null);
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);

  const { players, settings, elapsedSeconds, isRunning, subDialogOpen, pendingRecs, completedWindows, activeWindow } = state;

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
    if (!selectedOut || !selectedIn) {
      toast.error("Select one player out and one player in");
      return;
    }
    applySubstitution(selectedOut, selectedIn);
    setSelectedOut(null);
    setSelectedIn(null);
    setManualSubOpen(false);
    toast.success("Substitution applied");
  }

  function handleApplyRec(outId: string, inId: string) {
    applySubstitution(outId, inId);
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
            onClick={() =>
              dispatch({ type: isRunning ? "PAUSE" : "RESUME" })
            }
            className={`flex-1 h-10 rounded-xl font-semibold text-sm ${
              isRunning
                ? "bg-white/10 hover:bg-white/15 text-white"
                : "bg-[#a3e635] hover:bg-[#84cc16] text-[#0d1117]"
            }`}
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {isRunning ? (
              <><Pause size={16} className="mr-1.5" /> Pause</>
            ) : (
              <><Play size={16} className="mr-1.5" /> Resume</>
            )}
          </Button>
          <Button
            onClick={() => setManualSubOpen(true)}
            className="h-10 px-4 rounded-xl bg-white/8 hover:bg-white/15 text-white text-sm font-semibold"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <ArrowLeftRight size={16} className="mr-1.5" />
            Sub
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
      <Dialog open={subDialogOpen} onOpenChange={() => {}}>
        <DialogContent className="bg-[#161b22] border-white/10 text-white max-w-sm mx-auto rounded-2xl p-0 overflow-hidden">
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-5 py-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-400" />
              <DialogTitle
                className="text-white font-bold text-lg"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {SUB_WINDOWS.find((w) => w.id === activeWindow)?.label ?? "Substitution Time"}
              </DialogTitle>
            </div>
            <p className="text-white/50 text-sm mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Recommended substitutions to ensure fair play time
            </p>
          </div>

          <div className="px-5 py-4 space-y-3">
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
              pendingRecs.map((rec, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white/5 rounded-xl p-4 border border-white/8"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-white/60 text-xs" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          OUT
                        </span>
                        <span className="text-white font-semibold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          {rec.playerOut.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#a3e635]" />
                        <span className="text-white/60 text-xs" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          IN
                        </span>
                        <span className="text-white font-semibold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          {rec.playerIn.name}
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleApplyRec(rec.playerOut.id, rec.playerIn.id)}
                      className="h-9 px-4 rounded-xl bg-[#a3e635] hover:bg-[#84cc16] text-[#0d1117] text-sm font-bold shrink-0"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      Apply
                    </Button>
                  </div>
                  <p className="text-white/40 text-xs" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {rec.reason}
                  </p>
                </motion.div>
              ))
            )}
          </div>

          <div className="px-5 pb-5">
            <Button
              onClick={completeSubWindow}
              className="w-full h-12 rounded-xl bg-white/8 hover:bg-white/15 text-white font-semibold"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Done — Resume Game
              <ChevronRight size={16} className="ml-1" />
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
              Select who goes out and who comes in
            </p>
          </DialogHeader>

          <div className="px-5 py-4 space-y-4">
            <div>
              <p className="text-red-400 text-xs font-bold uppercase tracking-widest mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Player Out (on field)
              </p>
              <div className="space-y-1.5">
                {onField.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedOut(p.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                      selectedOut === p.id
                        ? "bg-red-500/20 border-red-500/50 text-white"
                        : "bg-white/5 border-white/8 text-white/70 hover:bg-white/10"
                    }`}
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {p.name}
                    <span className="text-xs text-white/40 ml-2">
                      {effectiveMinutes(p, elapsedMinutes).toFixed(1)} min
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[#a3e635] text-xs font-bold uppercase tracking-widest mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Player In (bench)
              </p>
              <div className="space-y-1.5">
                {bench.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedIn(p.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                      selectedIn === p.id
                        ? "bg-[#a3e635]/20 border-[#a3e635]/50 text-white"
                        : "bg-white/5 border-white/8 text-white/70 hover:bg-white/10"
                    }`}
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {p.name}
                    <span className="text-xs text-white/40 ml-2">
                      {effectiveMinutes(p, elapsedMinutes).toFixed(1)} min
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

          <div className="px-5 pb-5 flex gap-2">
            <Button
              onClick={() => { setManualSubOpen(false); setSelectedOut(null); setSelectedIn(null); }}
              className="flex-1 h-11 rounded-xl bg-white/8 hover:bg-white/15 text-white"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleManualSub}
              disabled={!selectedOut || !selectedIn}
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
