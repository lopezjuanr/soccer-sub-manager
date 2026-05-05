/**
 * SplashScreen — Age-group selector
 * Design: Clean Coach's App — near-black bg, electric lime accents
 *
 * Shows two large cards: 8U (4v4) and 11U (10v10).
 * The last-selected group is pre-highlighted (persisted in localStorage).
 * Tapping a card immediately navigates to the setup screen for that group.
 */

import { useGame } from "@/contexts/GameContext";
import { AGE_GROUP_CONFIG, AgeGroup } from "@/contexts/GameContext";
import { motion } from "framer-motion";

const FIELD_BG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663410153353/hocftoyG92dtZTVjDuaoFF/soccer-field-hero-fTHV8xXiyDewPsmcu5yyN3.webp";

interface ModeCardProps {
  group: AgeGroup;
  selected: boolean;
  onSelect: () => void;
}

function ModeCard({ group, selected, onSelect }: ModeCardProps) {
  const cfg = AGE_GROUP_CONFIG[group];

  const details =
    group === "8u"
      ? ["4 vs 4", `${cfg.minRoster}–${cfg.maxRoster} players`, `${cfg.defaultDuration}-min game`]
      : ["10 vs 10", `${cfg.minRoster}–${cfg.maxRoster} players`, `${cfg.defaultDuration}-min game`];

  return (
    <motion.button
      onClick={onSelect}
      whileTap={{ scale: 0.97 }}
      className={[
        "relative w-full rounded-2xl p-6 text-left transition-all border-2",
        selected
          ? "bg-[#a3e635]/10 border-[#a3e635] shadow-lg shadow-[#a3e635]/15"
          : "bg-white/5 border-white/10 hover:border-white/25 hover:bg-white/8",
      ].join(" ")}
    >
      {/* Selected indicator */}
      {selected && (
        <span className="absolute top-4 right-4 text-[10px] font-bold tracking-widest text-[#a3e635] bg-[#a3e635]/15 px-2.5 py-1 rounded-full uppercase">
          Last Used
        </span>
      )}

      {/* Age group badge */}
      <div
        className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 text-2xl font-black ${
          selected ? "bg-[#a3e635] text-[#0d1117]" : "bg-white/10 text-white"
        }`}
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {cfg.label}
      </div>

      {/* Title */}
      <h2
        className="text-white font-bold text-xl mb-1"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {group === "8u" ? "8U · 4v4" : "11U · 10v10"}
      </h2>

      {/* Details */}
      <ul className="space-y-1 mt-3">
        {details.map((d) => (
          <li
            key={d}
            className="flex items-center gap-2 text-sm text-white/60"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${selected ? "bg-[#a3e635]" : "bg-white/30"}`} />
            {d}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div
        className={`mt-5 text-sm font-semibold ${selected ? "text-[#a3e635]" : "text-white/40"}`}
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {selected ? "Tap to continue →" : "Tap to select →"}
      </div>
    </motion.button>
  );
}

export default function SplashScreen() {
  const { state, selectAgeGroup } = useGame();

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col">
      {/* Hero */}
      <div className="relative h-44 overflow-hidden shrink-0">
        <img
          src={FIELD_BG}
          alt="Soccer field"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0d1117]" />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl mb-2">⚽</span>
          <h1
            className="text-white font-black text-2xl tracking-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Sub Manager
          </h1>
          <p
            className="text-white/50 text-sm mt-1"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Select your age group to get started
          </p>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 px-4 pt-6 pb-10 space-y-4">
        <ModeCard
          group="8u"
          selected={state.ageGroup === "8u"}
          onSelect={() => selectAgeGroup("8u")}
        />
        <ModeCard
          group="11u"
          selected={state.ageGroup === "11u"}
          onSelect={() => selectAgeGroup("11u")}
        />
      </div>
    </div>
  );
}
