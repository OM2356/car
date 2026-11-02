import React from 'react';
import { Volume2, VolumeX, Pause } from 'lucide-react';
import { GameTelemetry, InputState } from '../types/game';

interface GameHUDProps {
  telemetry: GameTelemetry;
  inputs: InputState;
  onInputChange: (key: keyof InputState, value: boolean) => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  onPause: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  recentNearMiss: { points: number; text: string } | null;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  telemetry,
  inputs,
  onInputChange,
  onMoveLeft,
  onMoveRight,
  onPause,
  isMuted,
  onToggleMute,
  recentNearMiss,
}) => {
  // Speedometer calculation
  const speedPercentage = Math.min(telemetry.speedKmh / 280, 1.0);
  const rpmPercentage = Math.min(telemetry.rpm / 9000, 1.0);

  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-3 md:p-6 overflow-hidden">
      {/* TOP HEADER CLUSTER */}
      <div className="flex items-start justify-between w-full">
        {/* Score & Combo */}
        <div className="flex flex-col gap-1">
          <div className="bg-slate-950/80 border border-slate-700/60 backdrop-blur-md rounded-xl px-4 py-2 shadow-2xl flex items-baseline gap-3">
            <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">SCORE</span>
            <span className="text-2xl md:text-3xl font-black text-white tabular-nums tracking-wider">
              {telemetry.score.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Combo Badge */}
            {telemetry.combo > 1 && (
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-black px-3 py-1 rounded-lg text-xs md:text-sm tracking-wider uppercase animate-bounce shadow-lg shadow-orange-500/30">
                {telemetry.combo}X COMBO
              </div>
            )}

            {/* Distance readout */}
            <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg px-3 py-1 text-xs text-slate-300 font-mono tabular-nums">
              {(telemetry.distanceMeters / 1000).toFixed(2)} KM
            </div>
          </div>
        </div>

        {/* Near Miss Floating Toast */}
        {recentNearMiss && (
          <div className="animate-in fade-in zoom-in-95 duration-200 bg-cyan-500/90 text-slate-950 font-black px-4 py-2 rounded-xl text-sm md:text-base tracking-wider uppercase shadow-xl shadow-cyan-500/40 border border-cyan-200">
            {recentNearMiss.text}
          </div>
        )}

        {/* Top Right Utilities: Audio & Pause */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onToggleMute}
            className="w-10 h-10 rounded-xl bg-slate-950/80 border border-slate-700 hover:border-slate-500 text-slate-200 flex items-center justify-center transition-colors shadow-lg cursor-pointer"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
          </button>

          <button
            onClick={onPause}
            className="w-10 h-10 rounded-xl bg-slate-950/80 border border-slate-700 hover:border-slate-500 text-slate-200 flex items-center justify-center transition-colors shadow-lg cursor-pointer"
            title="Pause Game (Esc/P)"
          >
            <Pause className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* BOTTOM CLUSTER: GAUGES & MOBILE CONTROLS */}
      <div className="flex flex-col gap-3">
        {/* Interactive Controls Layer */}
        <div className="flex items-end justify-between w-full pointer-events-auto pb-1">
          {/* Left / Right Steering Buttons with 3-Lane Status Indicator */}
          <div className="flex flex-col items-start gap-1.5">
            {/* Lane Position Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-950/85 border border-slate-700/60 backdrop-blur-md shadow-lg text-[10px] font-mono font-bold tracking-wider">
              <span className="text-slate-400 text-[9px] mr-1">LANE:</span>
              <span
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  telemetry.laneIndex === 0 ? 'bg-cyan-500 text-slate-950 font-black shadow-sm' : 'text-slate-400'
                }`}
              >
                LEFT
              </span>
              <span className="text-slate-600">/</span>
              <span
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  telemetry.laneIndex === 1 ? 'bg-cyan-500 text-slate-950 font-black shadow-sm' : 'text-slate-400'
                }`}
              >
                CENTER
              </span>
              <span className="text-slate-600">/</span>
              <span
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  telemetry.laneIndex === 2 ? 'bg-cyan-500 text-slate-950 font-black shadow-sm' : 'text-slate-400'
                }`}
              >
                RIGHT
              </span>
            </div>

            {/* Steer Left and Steer Right Buttons */}
            <div className="flex items-center gap-2 md:gap-3">
              <button
                onTouchStart={(e) => {
                  e.preventDefault();
                  onMoveLeft?.();
                  onInputChange('steerLeft', true);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  onInputChange('steerLeft', false);
                }}
                onTouchCancel={() => onInputChange('steerLeft', false)}
                onMouseDown={() => {
                  onMoveLeft?.();
                  onInputChange('steerLeft', true);
                }}
                onMouseUp={() => onInputChange('steerLeft', false)}
                onMouseLeave={() => onInputChange('steerLeft', false)}
                className={`h-14 px-4 md:px-5 rounded-2xl flex items-center justify-center gap-1.5 text-sm md:text-base font-black transition-all shadow-xl cursor-pointer select-none active:scale-95 ${
                  inputs.steerLeft
                    ? 'bg-cyan-400 text-slate-950 scale-95 ring-2 ring-cyan-300'
                    : 'bg-slate-900/90 text-cyan-400 border border-cyan-500/40 hover:bg-slate-800'
                }`}
                title="Move Left (A / Left Arrow)"
              >
                <span className="text-lg">◀</span>
                <span>LEFT</span>
              </button>

              <button
                onTouchStart={(e) => {
                  e.preventDefault();
                  onMoveRight?.();
                  onInputChange('steerRight', true);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  onInputChange('steerRight', false);
                }}
                onTouchCancel={() => onInputChange('steerRight', false)}
                onMouseDown={() => {
                  onMoveRight?.();
                  onInputChange('steerRight', true);
                }}
                onMouseUp={() => onInputChange('steerRight', false)}
                onMouseLeave={() => onInputChange('steerRight', false)}
                className={`h-14 px-4 md:px-5 rounded-2xl flex items-center justify-center gap-1.5 text-sm md:text-base font-black transition-all shadow-xl cursor-pointer select-none active:scale-95 ${
                  inputs.steerRight
                    ? 'bg-cyan-400 text-slate-950 scale-95 ring-2 ring-cyan-300'
                    : 'bg-slate-900/90 text-cyan-400 border border-cyan-500/40 hover:bg-slate-800'
                }`}
                title="Move Right (D / Right Arrow)"
              >
                <span>RIGHT</span>
                <span className="text-lg">▶</span>
              </button>
            </div>
          </div>

          {/* Gas, Brake, Turbo Action Buttons */}
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onTouchStart={(e) => { e.preventDefault(); onInputChange('brake', true); }}
              onTouchEnd={(e) => { e.preventDefault(); onInputChange('brake', false); }}
              onTouchCancel={() => onInputChange('brake', false)}
              onMouseDown={() => onInputChange('brake', true)}
              onMouseUp={() => onInputChange('brake', false)}
              onMouseLeave={() => onInputChange('brake', false)}
              className={`h-14 px-3 md:px-4 rounded-2xl flex items-center justify-center text-xs md:text-sm font-black uppercase transition-all shadow-xl cursor-pointer select-none active:scale-95 ${
                inputs.brake
                  ? 'bg-rose-600 text-white scale-95'
                  : 'bg-slate-900/90 text-rose-400 border border-rose-900/50 hover:bg-slate-800'
              }`}
              title="Brake / Slow Down (S / Down Arrow)"
            >
              BRAKE
            </button>

            <button
              onTouchStart={(e) => { e.preventDefault(); onInputChange('turbo', true); }}
              onTouchEnd={(e) => { e.preventDefault(); onInputChange('turbo', false); }}
              onTouchCancel={() => onInputChange('turbo', false)}
              onMouseDown={() => onInputChange('turbo', true)}
              onMouseUp={() => onInputChange('turbo', false)}
              onMouseLeave={() => onInputChange('turbo', false)}
              disabled={telemetry.turbo < 10}
              className={`h-14 px-3 md:px-4 rounded-2xl flex items-center justify-center text-xs md:text-sm font-black uppercase transition-all shadow-xl cursor-pointer select-none active:scale-95 ${
                telemetry.isBoosting
                  ? 'bg-cyan-400 text-slate-950 scale-95 ring-2 ring-cyan-300'
                  : telemetry.turbo >= 10
                  ? 'bg-slate-900/90 text-cyan-400 border border-cyan-500/50 hover:bg-slate-800'
                  : 'bg-slate-950/50 text-slate-600 border border-slate-800 opacity-60'
              }`}
              title="Turbo Boost (Space)"
            >
              TURBO
            </button>

            <button
              onTouchStart={(e) => { e.preventDefault(); onInputChange('accelerate', true); }}
              onTouchEnd={(e) => { e.preventDefault(); onInputChange('accelerate', false); }}
              onTouchCancel={() => onInputChange('accelerate', false)}
              onMouseDown={() => onInputChange('accelerate', true)}
              onMouseUp={() => onInputChange('accelerate', false)}
              onMouseLeave={() => onInputChange('accelerate', false)}
              className={`h-14 px-4 md:px-6 rounded-2xl flex items-center justify-center text-xs md:text-sm font-black uppercase transition-all shadow-xl cursor-pointer select-none active:scale-95 ${
                inputs.accelerate
                  ? 'bg-emerald-500 text-slate-950 scale-95'
                  : 'bg-slate-900/90 text-emerald-400 border border-emerald-600/50 hover:bg-slate-800'
              }`}
              title="Accelerate / Gas (W / Up Arrow)"
            >
              GAS
            </button>
          </div>
        </div>

        {/* INSTRUMENT CLUSTER DOCK */}
        <div className="flex items-end justify-between w-full max-w-4xl mx-auto">
          {/* Turbo Nitro Meter */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 w-40 md:w-56 shadow-2xl flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>NITRO BOOST</span>
              <span className="text-cyan-400">{telemetry.turbo}%</span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-700/50">
              <div
                className={`h-full transition-all duration-150 ${
                  telemetry.isBoosting
                    ? 'bg-gradient-to-r from-cyan-400 to-blue-500 animate-pulse'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-400'
                }`}
                style={{ width: `${telemetry.turbo}%` }}
              />
            </div>
            <span className="text-[9px] text-slate-500 hidden md:block">Press [SPACE] or Hold [TURBO]</span>
          </div>

          {/* Center Speedometer & Tachometer */}
          <div className="bg-slate-950/85 border border-slate-700/60 rounded-2xl p-3 md:p-4 shadow-2xl flex items-center gap-4 md:gap-6">
            {/* Gear badge */}
            <div className="flex flex-col items-center">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">GEAR</span>
              <div className="w-9 h-9 md:w-11 md:h-11 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-xl md:text-2xl font-black text-cyan-400 shadow-inner">
                {telemetry.gear}
              </div>
            </div>

            {/* Big Speedometer */}
            <div className="flex flex-col items-center">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl md:text-6xl font-black text-white tabular-nums tracking-tighter">
                  {telemetry.speedKmh}
                </span>
                <span className="text-xs md:text-sm font-bold text-slate-400 uppercase">KM/H</span>
              </div>

              {/* Tachometer RPM arc bar */}
              <div className="w-28 md:w-40 bg-slate-900 rounded-full h-1.5 overflow-hidden mt-1 border border-slate-800">
                <div
                  className={`h-full transition-all duration-75 ${
                    rpmPercentage > 0.85 ? 'bg-rose-500' : 'bg-cyan-400'
                  }`}
                  style={{ width: `${rpmPercentage * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Controls Hint / Record Cluster */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 w-40 md:w-56 shadow-2xl flex flex-col gap-1">
            <div className="flex justify-between items-center text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>BEST RECORD</span>
              <span className="text-amber-400 tabular-nums">{telemetry.highScore.toLocaleString()}</span>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>NEAR MISSES:</span>
              <span className="text-cyan-400 font-bold tabular-nums">{telemetry.nearMissCount}</span>
            </div>
            <div className="text-[9px] text-slate-500 hidden md:block pt-0.5">
              [W/S/A/D] or Arrow Keys to steer
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
