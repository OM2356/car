import React from 'react';
import { RotateCcw, Home, Trophy, Gauge, Target, Compass } from 'lucide-react';

interface GameOverModalProps {
  score: number;
  highScore: number;
  distanceMeters: number;
  topSpeedKmh: number;
  nearMisses: number;
  onRestart: () => void;
  onMainMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  score,
  highScore,
  distanceMeters,
  topSpeedKmh,
  nearMisses,
  onRestart,
  onMainMenu,
}) => {
  const isNewRecord = score >= highScore && score > 0;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col gap-6 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 bg-rose-600/20 blur-3xl rounded-full pointer-events-none" />

        {/* Title & Status */}
        <div className="flex flex-col items-center text-center">
          <span className="text-xs uppercase tracking-widest font-black text-rose-500">
            COLLISION DETECTED
          </span>
          <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter text-white mt-1">
            GAME OVER
          </h2>
          {isNewRecord && (
            <div className="mt-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-black tracking-wider uppercase flex items-center gap-1.5 shadow-lg shadow-amber-500/20">
              <Trophy className="w-3.5 h-3.5" /> NEW PERSONAL BEST!
            </div>
          )}
        </div>

        {/* Primary Score Board */}
        <div className="bg-slate-950/90 border border-slate-800/80 rounded-2xl p-4 flex flex-col items-center">
          <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">FINAL SCORE</span>
          <span className="text-4xl md:text-5xl font-black text-white tabular-nums tracking-wide mt-1">
            {score.toLocaleString()}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
            <span>HIGH SCORE:</span>
            <span className="text-amber-400 font-bold tabular-nums">{highScore.toLocaleString()}</span>
          </div>
        </div>

        {/* Secondary Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5 text-center">
          {/* Distance */}
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3 flex flex-col items-center">
            <Compass className="w-4 h-4 text-cyan-400 mb-1" />
            <span className="text-[10px] uppercase font-bold text-slate-400">DISTANCE</span>
            <span className="text-sm md:text-base font-bold text-white tabular-nums">
              {(distanceMeters / 1000).toFixed(2)} KM
            </span>
          </div>

          {/* Top Speed */}
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3 flex flex-col items-center">
            <Gauge className="w-4 h-4 text-emerald-400 mb-1" />
            <span className="text-[10px] uppercase font-bold text-slate-400">TOP SPEED</span>
            <span className="text-sm md:text-base font-bold text-white tabular-nums">
              {topSpeedKmh} <span className="text-[10px] text-slate-400">KM/H</span>
            </span>
          </div>

          {/* Near Misses */}
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3 flex flex-col items-center">
            <Target className="w-4 h-4 text-orange-400 mb-1" />
            <span className="text-[10px] uppercase font-bold text-slate-400">NEAR MISS</span>
            <span className="text-sm md:text-base font-bold text-white tabular-nums">
              {nearMisses}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onRestart}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-base md:text-lg tracking-wider uppercase shadow-xl shadow-cyan-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>RACE AGAIN</span>
            <span className="text-xs font-mono font-bold bg-slate-950/20 px-2 py-0.5 rounded ml-1">
              SPACE
            </span>
          </button>

          <button
            onClick={onMainMenu}
            className="w-full py-3 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-sm tracking-wider uppercase transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>MAIN MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
