import React from 'react';
import { Play, Volume2, VolumeX, HelpCircle, Trophy, Gauge, Zap } from 'lucide-react';
import { CAR_COLORS } from '../types/game';

interface MainMenuProps {
  onStartRace: () => void;
  onOpenHowToPlay: () => void;
  selectedColorId: string;
  onSelectColor: (colorId: string) => void;
  highScore: number;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartRace,
  onOpenHowToPlay,
  selectedColorId,
  onSelectColor,
  highScore,
  isMuted,
  onToggleMute,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-4 md:p-8 overflow-y-auto">
      {/* TOP HEADER */}
      <div className="flex items-start justify-between w-full">
        {/* Brand / Logo lockup */}
        <div className="pointer-events-auto">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 font-mono text-[11px] font-bold tracking-widest uppercase">
              HIGHWAY SPEEDWAY
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-cyan-500 drop-shadow-[0_4px_16px_rgba(0,210,255,0.4)] mt-1">
            TURBO RUSH <span className="text-cyan-400">3D</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400 max-w-sm mt-0.5">
            Dodge traffic at 280+ km/h, execute near-miss combos, and dominate the endless highway.
          </p>
        </div>

        {/* Top Right Utilities */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onToggleMute}
            className="px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 hover:border-slate-500 text-slate-200 flex items-center gap-2 transition-all shadow-lg cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            <span className="text-xs font-bold hidden sm:inline">{isMuted ? 'SOUND OFF' : 'SOUND ON'}</span>
          </button>

          <button
            onClick={onOpenHowToPlay}
            className="px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 hover:border-slate-500 text-slate-200 flex items-center gap-2 transition-all shadow-lg cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold hidden sm:inline">CONTROLS</span>
          </button>
        </div>
      </div>

      {/* CENTER EMPTY SPACE FOR 3D CAR TURNTABLE PREVIEW */}

      {/* BOTTOM ACTION & CUSTOMIZATION BAR */}
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-4 pointer-events-auto">
        {/* Car Livery / Paint Color Picker */}
        <div className="bg-slate-950/85 border border-slate-800 rounded-2xl p-3 md:p-4 backdrop-blur-md shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">LIVERY COLOR:</span>
            <span className="text-xs font-black text-cyan-400">
              {CAR_COLORS.find((c) => c.id === selectedColorId)?.name}
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap justify-center">
            {CAR_COLORS.map((color) => {
              const isSelected = color.id === selectedColorId;
              return (
                <button
                  key={color.id}
                  onClick={() => onSelectColor(color.id)}
                  title={color.name}
                  className={`w-8 h-8 rounded-full transition-all cursor-pointer relative flex items-center justify-center ${
                    isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950 scale-110 shadow-lg' : 'hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: color.cssColor }}
                >
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white shadow-sm" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Start Game & Highscore Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* High Score Badge */}
          <div className="bg-slate-950/85 border border-slate-800 rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">ALL-TIME BEST</div>
              <div className="text-2xl font-black text-white tabular-nums tracking-wide">
                {highScore.toLocaleString()} <span className="text-xs text-amber-400 font-semibold">PTS</span>
              </div>
            </div>
          </div>

          {/* Big Start Button */}
          <button
            onClick={onStartRace}
            className="flex-1 sm:flex-initial px-8 md:px-12 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-black text-lg md:text-xl tracking-wider uppercase shadow-2xl shadow-cyan-500/30 hover:shadow-cyan-400/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer group"
          >
            <Play className="w-6 h-6 fill-slate-950 group-hover:scale-110 transition-transform" />
            <span>START RACE</span>
            <span className="hidden md:inline-block px-2 py-0.5 rounded-md bg-slate-950/20 text-[11px] font-mono font-bold text-slate-950 ml-2">
              SPACE / ENTER
            </span>
          </button>
        </div>

        {/* Feature Highlights Pills */}
        <div className="flex items-center justify-center gap-4 text-xs text-slate-400 font-medium">
          <span className="flex items-center gap-1.5">
            <Gauge className="w-4 h-4 text-cyan-400" /> 280+ KM/H Turbo
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400" /> Near-Miss Combos
          </span>
          <span className="hidden sm:inline text-slate-500">
            Use WASD or Arrow Keys to steer
          </span>
        </div>
      </div>
    </div>
  );
};
