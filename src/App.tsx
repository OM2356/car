/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/GameEngine';
import { soundManager } from './audio/SoundManager';
import { GameHUD } from './components/GameHUD';
import { MainMenu } from './components/MainMenu';
import { GameOverModal } from './components/GameOverModal';
import { PauseModal } from './components/PauseModal';
import { HowToPlayModal } from './components/HowToPlayModal';
import { GameState, GameTelemetry, InputState, CAR_COLORS } from './types/game';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // High score from localStorage
  const [highScore, setHighScore] = useState<number>(() => {
    const saved = localStorage.getItem('turborush3d_highscore');
    return saved ? parseInt(saved, 10) : 0;
  });

  // State management
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [selectedColorId, setSelectedColorId] = useState<string>('crimson');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(false);

  // Live Telemetry
  const [telemetry, setTelemetry] = useState<GameTelemetry>({
    speedKmh: 0,
    rpm: 1000,
    gear: 1,
    distanceMeters: 0,
    score: 0,
    highScore: 0,
    combo: 1,
    turbo: 50,
    isBoosting: false,
    nearMissCount: 0,
    laneIndex: 1,
    weather: 'CLEAR',
    traction: 1.0,
    visibilityMeters: 350,
    weatherBonus: 1.0,
    recentNearMiss: null,
  });

  // Recent near-miss popup toast
  const [nearMissToast, setNearMissToast] = useState<{ points: number; text: string } | null>(null);
  const nearMissTimeoutRef = useRef<number | null>(null);

  // Game Over summary statistics
  const [gameOverStats, setGameOverStats] = useState<{
    score: number;
    distance: number;
    topSpeed: number;
    nearMisses: number;
  }>({
    score: 0,
    distance: 0,
    topSpeed: 0,
    nearMisses: 0,
  });

  // Keyboard input state
  const inputsRef = useRef<InputState>({
    steerLeft: false,
    steerRight: false,
    accelerate: false,
    brake: false,
    turbo: false,
  });

  // Handle telemetry updates from engine
  const handleTelemetryUpdate = useCallback((data: GameTelemetry) => {
    setTelemetry(data);

    if (data.recentNearMiss) {
      setNearMissToast({ points: data.recentNearMiss.points, text: data.recentNearMiss.text });
      if (nearMissTimeoutRef.current) clearTimeout(nearMissTimeoutRef.current);
      nearMissTimeoutRef.current = window.setTimeout(() => {
        setNearMissToast(null);
      }, 1400);
    }
  }, []);

  // Handle Game Over
  const handleGameOver = useCallback(
    (finalScore: number, distance: number, topSpeed: number, nearMisses: number) => {
      setGameOverStats({
        score: finalScore,
        distance,
        topSpeed,
        nearMisses,
      });

      if (finalScore > highScore) {
        setHighScore(finalScore);
      }

      setGameState('GAMEOVER');
    },
    [highScore]
  );

  // Initialize GameEngine once
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const engine = new GameEngine(
      canvasMountRef.current,
      handleTelemetryUpdate,
      handleGameOver,
      highScore
    );
    engineRef.current = engine;

    // Apply initial color
    const initialColor = CAR_COLORS.find((c) => c.id === selectedColorId);
    if (initialColor) {
      engine.setPaintColor(initialColor.hex);
    }

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [handleGameOver, handleTelemetryUpdate, highScore, selectedColorId]);

  // Color picker handler
  const handleSelectColor = (colorId: string) => {
    setSelectedColorId(colorId);
    const colorConfig = CAR_COLORS.find((c) => c.id === colorId);
    if (colorConfig && engineRef.current) {
      engineRef.current.setPaintColor(colorConfig.hex);
    }
    soundManager.playButtonClick();
  };

  // Start Race
  const handleStartRace = useCallback(() => {
    soundManager.resume();
    soundManager.playButtonClick();
    setGameState('PLAYING');
    if (engineRef.current) {
      engineRef.current.startRace();
    }
  }, []);

  // Pause & Resume
  const handlePause = useCallback(() => {
    if (gameState === 'PLAYING') {
      soundManager.playButtonClick();
      setGameState('PAUSED');
      engineRef.current?.pauseGame();
    }
  }, [gameState]);

  const handleResume = useCallback(() => {
    if (gameState === 'PAUSED') {
      soundManager.playButtonClick();
      setGameState('PLAYING');
      engineRef.current?.resumeGame();
    }
  }, [gameState]);

  // Restart
  const handleRestart = useCallback(() => {
    soundManager.playButtonClick();
    setGameState('PLAYING');
    engineRef.current?.startRace();
  }, []);

  // Back to Main Menu
  const handleMainMenu = useCallback(() => {
    soundManager.playButtonClick();
    setGameState('MENU');
    engineRef.current?.setMenuMode();
  }, []);

  // Toggle Mute
  const handleToggleMute = useCallback(() => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  }, []);

  // Keyboard input listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Resume audio context on first key press
      soundManager.resume();

      if (e.repeat) return;

      const engine = engineRef.current;
      if (!engine) return;

      const key = e.key.toLowerCase();

      // Menu shortcuts: Space or Enter to start
      if (gameState === 'MENU' && (e.code === 'Space' || e.code === 'Enter') && !showHowToPlay) {
        e.preventDefault();
        handleStartRace();
        return;
      }

      // Game Over shortcuts: Space or Enter to restart
      if (gameState === 'GAMEOVER' && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        handleRestart();
        return;
      }

      // Pause toggle: Esc or P
      if (key === 'p' || e.code === 'Escape') {
        e.preventDefault();
        if (gameState === 'PLAYING') {
          handlePause();
        } else if (gameState === 'PAUSED') {
          handleResume();
        }
        return;
      }

      // Active racing controls
      if (gameState === 'PLAYING') {
        if (key === 'a' || e.key === 'ArrowLeft') {
          if (!inputsRef.current.steerLeft) {
            inputsRef.current.steerLeft = true;
            engine.inputs.steerLeft = true;
            engine.moveLeft();
          }
        }
        if (key === 'd' || e.key === 'ArrowRight') {
          if (!inputsRef.current.steerRight) {
            inputsRef.current.steerRight = true;
            engine.inputs.steerRight = true;
            engine.moveRight();
          }
        }
        if (key === 'w' || e.key === 'ArrowUp') {
          inputsRef.current.accelerate = true;
          engine.inputs.accelerate = true;
        }
        if (key === 's' || e.key === 'ArrowDown') {
          inputsRef.current.brake = true;
          engine.inputs.brake = true;
        }
        if (e.code === 'Space') {
          e.preventDefault();
          inputsRef.current.turbo = true;
          engine.inputs.turbo = true;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;

      const key = e.key.toLowerCase();

      if (key === 'a' || e.key === 'ArrowLeft') {
        inputsRef.current.steerLeft = false;
        engine.inputs.steerLeft = false;
      }
      if (key === 'd' || e.key === 'ArrowRight') {
        inputsRef.current.steerRight = false;
        engine.inputs.steerRight = false;
      }
      if (key === 'w' || e.key === 'ArrowUp') {
        inputsRef.current.accelerate = false;
        engine.inputs.accelerate = false;
      }
      if (key === 's' || e.key === 'ArrowDown') {
        inputsRef.current.brake = false;
        engine.inputs.brake = false;
      }
      if (e.code === 'Space') {
        inputsRef.current.turbo = false;
        engine.inputs.turbo = false;
      }
    };

    const handleBlur = () => {
      // Clear held keys on window blur
      inputsRef.current = {
        steerLeft: false,
        steerRight: false,
        accelerate: false,
        brake: false,
        turbo: false,
      };
      if (engineRef.current) {
        engineRef.current.inputs = { ...inputsRef.current };
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [gameState, handlePause, handleRestart, handleResume, handleStartRace, showHowToPlay]);

  // Touch button input handler
  const handleTouchInputChange = (key: keyof InputState, value: boolean) => {
    soundManager.resume();
    inputsRef.current[key] = value;
    const engine = engineRef.current;
    if (engine) {
      engine.inputs[key] = value;
      if (value && key === 'steerLeft') {
        engine.moveLeft();
      } else if (value && key === 'steerRight') {
        engine.moveRight();
      }
    }
  };

  const handleMoveLeft = useCallback(() => {
    soundManager.resume();
    engineRef.current?.moveLeft();
  }, []);

  const handleMoveRight = useCallback(() => {
    soundManager.resume();
    engineRef.current?.moveRight();
  }, []);

  const handleCycleWeather = useCallback(() => {
    soundManager.resume();
    engineRef.current?.cycleWeather();
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none touch-none">
      {/* 3D WebGL Canvas Container */}
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full" />

      {/* Main Menu Layer */}
      {gameState === 'MENU' && (
        <MainMenu
          onStartRace={handleStartRace}
          onOpenHowToPlay={() => setShowHowToPlay(true)}
          selectedColorId={selectedColorId}
          onSelectColor={handleSelectColor}
          highScore={highScore}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Live In-Game HUD Layer */}
      {(gameState === 'PLAYING' || gameState === 'PAUSED') && (
        <GameHUD
          telemetry={{ ...telemetry, highScore }}
          inputs={inputsRef.current}
          onInputChange={handleTouchInputChange}
          onMoveLeft={handleMoveLeft}
          onMoveRight={handleMoveRight}
          onCycleWeather={handleCycleWeather}
          onPause={handlePause}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          recentNearMiss={nearMissToast}
        />
      )}

      {/* Pause Modal */}
      {gameState === 'PAUSED' && (
        <PauseModal
          onResume={handleResume}
          onRestart={handleRestart}
          onMainMenu={handleMainMenu}
        />
      )}

      {/* Game Over Modal */}
      {gameState === 'GAMEOVER' && (
        <GameOverModal
          score={gameOverStats.score}
          highScore={highScore}
          distanceMeters={gameOverStats.distance}
          topSpeedKmh={gameOverStats.topSpeed}
          nearMisses={gameOverStats.nearMisses}
          onRestart={handleRestart}
          onMainMenu={handleMainMenu}
        />
      )}

      {/* How To Play Modal */}
      {showHowToPlay && (
        <HowToPlayModal onClose={() => setShowHowToPlay(false)} />
      )}
    </div>
  );
}
