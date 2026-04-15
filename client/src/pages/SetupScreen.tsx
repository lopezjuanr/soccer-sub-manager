/**
 * SetupScreen — Roster entry with drag-to-reorder
 * Design: Clean Coach's App — near-black bg, electric lime accents, Space Grotesk + DM Sans
 * Game duration is fixed at 40 minutes (each player must play at least 16 min total, 7 min per half)
 * First 4 players in the list start on the field — drag to control who starts
 */

import { useState, useRef } from "react";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserPlus, Trash2, Play, Users, GripVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Player } from "@/lib/gameEngine";

const FIELD_BG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663410153353/hocftoyG92dtZTVjDuaoFF/soccer-field-hero-fTHV8xXiyDewPsmcu5yyN3.webp";

// ── Sortable player row ──────────────────────────────────────────────────────

function SortablePlayerRow({
  player,
  index,
  onRemove,
}: {
  player: Player;
  index: number;
  onRemove: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: player.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const isStarter = index < 4;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-xl px-3 py-3 border transition-colors ${
        isDragging
          ? "bg-white/12 border-[#a3e635]/40 shadow-lg"
          : isStarter
          ? "bg-white/6 border-white/8"
          : "bg-white/3 border-white/5"
      }`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="text-white/25 hover:text-white/60 transition-colors touch-none p-1 -ml-1 cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical size={16} />
      </button>

      {/* Position number */}
      <span
        className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
          isStarter
            ? "bg-[#a3e635]/15 text-[#a3e635]"
            : "bg-white/8 text-white/30"
        }`}
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {index + 1}
      </span>

      {/* Name */}
      <span
        className={`flex-1 font-medium text-sm ${isStarter ? "text-white" : "text-white/60"}`}
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {player.name}
      </span>

      {/* Starts badge */}
      {isStarter && (
        <span className="text-[10px] text-[#a3e635] font-semibold bg-[#a3e635]/10 px-2 py-0.5 rounded-full shrink-0">
          STARTS
        </span>
      )}

      {/* Delete */}
      <button
        onClick={() => onRemove(player.id)}
        className="text-white/25 hover:text-red-400 transition-colors p-1 shrink-0"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────

export default function SetupScreen() {
  const { state, addPlayer, removePlayer, startGame, dispatch } = useGame();
  const [nameInput, setNameInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [durationModalOpen, setDurationModalOpen] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(40);

  const players = state.players;
  const canStart = players.length >= 5 && players.length <= 7;

  // dnd-kit sensors — support both mouse and touch with a small activation distance
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = players.findIndex((p) => p.id === active.id);
    const newIndex = players.findIndex((p) => p.id === over.id);
    const reordered = arrayMove(players, oldIndex, newIndex);
    dispatch({ type: "SET_ROSTER", players: reordered });
  }

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
    setDurationModalOpen(true);
  }

  function handleConfirmDuration() {
    dispatch({ type: "SET_SETTINGS", settings: { totalMinutes: selectedDuration, fieldSize: 4 } });
    setDurationModalOpen(false);
    startGame();
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
            <h1
              className="text-white font-bold text-2xl tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Sub Manager
            </h1>
          </div>
          <p
            className="text-white/60 text-sm"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            8U · 4v4 · 40-Minute Game
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pt-5 pb-8 space-y-6">

        {/* Roster */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-[#a3e635]" />
              <h2
                className="text-white/80 text-sm font-semibold uppercase tracking-widest"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
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

          {/* Drag hint */}
          {players.length >= 2 && (
            <p
              className="text-white/30 text-xs mb-3 flex items-center gap-1"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <GripVertical size={11} />
              Drag to reorder — top 4 start on the field
            </p>
          )}

          {/* Sortable player list */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={players.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                <AnimatePresence>
                  {players.map((player, index) => (
                    <motion.div
                      key={player.id}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.15 }}
                    >
                      <SortablePlayerRow
                        player={player}
                        index={index}
                        onRemove={removePlayer}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>

                {players.length === 0 && (
                  <div
                    className="text-center py-8 text-white/30 text-sm"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Add 5–7 players to get started
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>

          {players.length > 0 && players.length < 5 && (
            <p
              className="text-amber-400/80 text-xs text-center mt-3"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Add {5 - players.length} more player
              {5 - players.length !== 1 ? "s" : ""} to start
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

      </div>

      {/* Duration Selection Modal */}
      <Dialog open={durationModalOpen} onOpenChange={setDurationModalOpen}>
        <DialogContent className="bg-[#161b22] border-white/10 text-white max-w-sm mx-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle
              className="text-white font-bold text-lg"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Game Duration
            </DialogTitle>
          </DialogHeader>
          <p className="text-white/50 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Select how long you want the game to be
          </p>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {[20, 25, 30, 35, 40].map((duration) => (
              <button
                key={duration}
                onClick={() => setSelectedDuration(duration)}
                className={`py-3 rounded-xl font-semibold transition-all ${
                  selectedDuration === duration
                    ? "bg-[#a3e635] text-[#0d1117] ring-2 ring-[#a3e635]/50"
                    : "bg-white/8 text-white hover:bg-white/15 border border-white/10"
                }`}
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {duration}m
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              onClick={() => setDurationModalOpen(false)}
              className="flex-1 h-11 rounded-xl bg-white/8 hover:bg-white/15 text-white"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDuration}
              className="flex-1 h-11 rounded-xl bg-[#a3e635] hover:bg-[#84cc16] text-[#0d1117] font-bold"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Start {selectedDuration}m Game
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
