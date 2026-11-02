import React from 'react';
import { X, Keyboard, Smartphone, Zap, Target } from 'lucide-react';

interface HowToPlayModalProps {
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ onClose }) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col gap-6 relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div>
          <span className="text-xs uppercase tracking-widest font-black text-cyan-400">
            DRIVER'S MANUAL
          </span>
          <h2 className="text-2xl md:text-3xl font-black italic tracking-tighter text-white mt-1">
            HOW TO PLAY
          </h2>
        </div>

        {/* Desktop Controls */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
            <Keyboard className="w-4 h-4 text-cyan-400" />
            <span>DESKTOP CONTROLS</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex justify-between items-center">
              <span className="text-slate-400">Steer Left / Right</span>
              <span className="font-mono font-bold text-cyan-300 bg-slate-800 px-2 py-0.5 rounded">
                A / D or ← / →
              </span>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex justify-between items-center">
              <span className="text-slate-400">Accelerate (Gas)</span>
              <span className="font-mono font-bold text-emerald-300 bg-slate-800 px-2 py-0.5 rounded">
                W or ↑
              </span>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex justify-between items-center">
              <span className="text-slate-400">Brake / Slow Down</span>
              <span className="font-mono font-bold text-rose-300 bg-slate-800 px-2 py-0.5 rounded">
                S or ↓
              </span>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex justify-between items-center">
              <span className="text-slate-400">Nitro Turbo Boost</span>
              <span className="font-mono font-bold text-cyan-300 bg-slate-800 px-2 py-0.5 rounded">
                SPACE
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Controls */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
            <Smartphone className="w-4 h-4 text-cyan-400" />
            <span>MOBILE CONTROLS</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Use on-screen touch buttons for steering (bottom-left) and acceleration, braking, and turbo boost (bottom-right).
          </p>
        </div>

        {/* Scoring & Near-Miss Mechanics */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
            <Target className="w-4 h-4 text-amber-400" />
            <span>PRO RACING TIPS</span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-2 text-xs text-slate-300">
            <div className="flex items-start gap-2">
              <Zap className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-white">Near-Miss Bonus:</strong> Pass closely next to another vehicle at over 110 km/h to trigger a Near-Miss bonus (+500 pts multiplied by your combo) and recharge your Turbo meter!
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-white">Top Speed Multiplier:</strong> Driving at high speeds continuously multiplies your distance points.
              </span>
            </div>
          </div>
        </div>

        {/* Close CTA */}
        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-cyan-500/20"
        >
          GOT IT, LET'S RACE!
        </button>
      </div>
    </div>
  );
};
