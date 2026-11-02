import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  createAsphaltTexture,
  createPlayerCar,
  createTrafficVehicle,
  createRoadChunk,
  PlayerCarInstance,
  TrafficCarInstance,
  TrafficType,
  RoadChunkInstance,
} from './proceduralModels';
import { ParticleSystem } from './particles';
import { soundManager } from '../audio/SoundManager';
import { GameState, GameTelemetry, InputState } from '../types/game';

// Software WebGL detection guard from Three.js skill
function detectSoftwareGl(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

// Pre-allocated math objects to ensure zero GC spikes
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _boxPlayer = new THREE.Box3();
const _boxTraffic = new THREE.Box3();

const LANE_CENTERS = [-3.7, 0, 3.7];
const ROAD_MIN_X = -5.6;
const ROAD_MAX_X = 5.6;
const CHUNK_LENGTH = 120;
const NUM_CHUNKS = 4;

export class GameEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;

  // Environment
  private roadChunks: RoadChunkInstance[] = [];
  private asphaltTexture: THREE.CanvasTexture;
  private particleSystem: ParticleSystem;

  // Actors
  private playerCar: PlayerCarInstance;
  private trafficCars: TrafficCarInstance[] = [];
  private activeNearMisses: Set<TrafficCarInstance> = new Set();

  // Lighting
  private dirLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;

  // Game Loop
  private animationFrameId: number = 0;
  private lastTime: number = 0;
  private isRunning: boolean = false;
  private hitstopTimer: number = 0;

  // Game State
  private state: GameState = 'MENU';
  private score: number = 0;
  private highScore: number = 0;
  private distanceTraveled: number = 0;
  private combo: number = 1;
  private comboTimer: number = 0;
  private nearMissCount: number = 0;
  private turboCharge: number = 50; // 0 to 100
  private isBoosting: boolean = false;

  // 3-Lane Highway System (0: Left = -3.7, 1: Center = 0.0, 2: Right = +3.7)
  private currentLaneIndex: number = 1;
  private targetLaneIndex: number = 1;
  private laneHoldTimer: number = 0;

  // Vehicle Dynamics
  private speedKmh: number = 0;
  private targetSpeedKmh: number = 0;
  private lateralVelocity: number = 0;
  private currentSteerAngle: number = 0;
  private carTiltAngle: number = 0;
  private carPitchAngle: number = 0;

  // Camera dynamics
  private cameraShakeIntensity: number = 0;
  private menuOrbitAngle: number = 0;

  // Crash State
  private isCrashing: boolean = false;
  private crashVelocity: THREE.Vector3 = new THREE.Vector3();
  private crashAngularVelocity: THREE.Vector3 = new THREE.Vector3();

  // Callbacks
  private onTelemetryUpdate: (telemetry: GameTelemetry) => void;
  private onGameOver: (finalScore: number, distance: number, topSpeed: number, nearMisses: number) => void;
  private topSpeedRecorded: number = 0;

  // Inputs
  public inputs: InputState = {
    steerLeft: false,
    steerRight: false,
    accelerate: false,
    brake: false,
    turbo: false,
  };

  constructor(
    container: HTMLElement,
    onTelemetryUpdate: (telemetry: GameTelemetry) => void,
    onGameOver: (finalScore: number, distance: number, topSpeed: number, nearMisses: number) => void,
    initialHighScore: number = 0
  ) {
    this.container = container;
    this.onTelemetryUpdate = onTelemetryUpdate;
    this.onGameOver = onGameOver;
    this.highScore = initialHighScore;

    this.isSoftwareGl = detectSoftwareGl();

    // 1. Scene & Atmosphere
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Bright daytime sky
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.0075);

    // 2. Camera
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(62, aspect, 0.1, 400);

    // 3. Renderer with Three.js skill directives
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // 4. Studio Environment Reflection
    try {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
    } catch {
      // Fallback
    }

    // 5. Lighting
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x445544, 0.9);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfffaed, 2.2);
    this.dirLight.position.set(40, 70, 50);
    if (!this.isSoftwareGl) {
      this.dirLight.castShadow = true;
      this.dirLight.shadow.mapSize.width = 1024;
      this.dirLight.shadow.mapSize.height = 1024;
      this.dirLight.shadow.camera.near = 10;
      this.dirLight.shadow.camera.far = 180;
      const d = 30;
      this.dirLight.shadow.camera.left = -d;
      this.dirLight.shadow.camera.right = d;
      this.dirLight.shadow.camera.top = d;
      this.dirLight.shadow.camera.bottom = -d;
      this.dirLight.shadow.bias = -0.0005;
      this.dirLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.dirLight);

    // 6. Procedural Road Texture & Chunks
    this.asphaltTexture = createAsphaltTexture();
    for (let i = 0; i < NUM_CHUNKS; i++) {
      const chunk = createRoadChunk(CHUNK_LENGTH, this.asphaltTexture);
      chunk.root.position.z = i * CHUNK_LENGTH;
      this.scene.add(chunk.root);
      this.roadChunks.push(chunk);
    }

    // 7. Particles
    this.particleSystem = new ParticleSystem(this.scene);

    // 8. Player Car
    this.playerCar = createPlayerCar(0xd91b24);
    this.playerCar.root.position.set(0, 0, 0);
    this.scene.add(this.playerCar.root);

    // Position camera for menu showcase
    this.setMenuMode();

    // Start render loop
    this.isRunning = true;
    this.lastTime = performance.now();
    this.tick = this.tick.bind(this);
    this.animationFrameId = requestAnimationFrame(this.tick);

    window.addEventListener('resize', this.onResize);
  }

  public setPaintColor(hex: number) {
    this.playerCar.setPaintColor(hex);
  }

  public setMenuMode() {
    this.state = 'MENU';
    this.speedKmh = 0;
    this.isCrashing = false;
    soundManager.stopEngine();
  }

  public moveLeft() {
    if (this.state !== 'PLAYING' || this.isCrashing) return;
    // Move to left lane: index 2 -> 1, or 1 -> 0. Already at 0 (leftmost) -> stay at 0.
    if (this.targetLaneIndex > 0) {
      this.targetLaneIndex -= 1;
      this.laneHoldTimer = 0.28;
    }
  }

  public moveRight() {
    if (this.state !== 'PLAYING' || this.isCrashing) return;
    // Move to right lane: index 0 -> 1, or 1 -> 2. Already at 2 (rightmost) -> stay at 2.
    if (this.targetLaneIndex < 2) {
      this.targetLaneIndex += 1;
      this.laneHoldTimer = 0.28;
    }
  }

  public getLaneIndex(): number {
    return this.targetLaneIndex;
  }

  public startRace() {
    this.state = 'PLAYING';
    this.score = 0;
    this.distanceTraveled = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.nearMissCount = 0;
    this.turboCharge = 40;
    this.isBoosting = false;
    this.isCrashing = false;
    this.topSpeedRecorded = 0;
    this.hitstopTimer = 0;

    // Reset 3-lane state to Center Lane (index 1 = 0.0)
    this.currentLaneIndex = 1;
    this.targetLaneIndex = 1;
    this.laneHoldTimer = 0;

    // Reset player position perfectly in Center Lane
    this.playerCar.root.position.set(LANE_CENTERS[1], 0, 0);
    this.playerCar.root.rotation.set(0, 0, 0);
    this.speedKmh = 60; // Starting rolling speed
    this.targetSpeedKmh = 140;
    this.lateralVelocity = 0;
    this.currentSteerAngle = 0;
    this.carTiltAngle = 0;
    this.carPitchAngle = 0;

    // Clean existing traffic
    this.clearTraffic();

    // Spawn initial wave of traffic
    for (let i = 0; i < 7; i++) {
      this.spawnTrafficCar(60 + i * 28 + Math.random() * 12);
    }

    soundManager.resume();
    soundManager.playCountdownBeep(true);
  }

  public pauseGame() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      soundManager.stopEngine();
    }
  }

  public resumeGame() {
    if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      soundManager.resume();
    }
  }

  private clearTraffic() {
    this.trafficCars.forEach((c) => {
      this.scene.remove(c.root);
    });
    this.trafficCars = [];
    this.activeNearMisses.clear();
  }

  private spawnTrafficCar(spawnZ: number) {
    const types: TrafficType[] = ['SEDAN', 'SUV', 'SUPERCAR', 'TRUCK'];
    const chosenType = types[Math.floor(Math.random() * types.length)];

    const colors = [0x1f4f89, 0xc42021, 0xededed, 0x222222, 0xd48806, 0x437a34, 0x722ed1];
    const chosenColor = colors[Math.floor(Math.random() * colors.length)];

    const traffic = createTrafficVehicle(chosenType, chosenColor);

    // Pick lane
    const laneIndex = Math.floor(Math.random() * 3);
    const laneX = LANE_CENTERS[laneIndex];

    traffic.root.position.set(laneX, 0, spawnZ);
    traffic.targetLaneX = laneX;
    traffic.currentLaneX = laneX;

    // Speed: 65 - 110 km/h, converted to m/s
    const speedKmh = 65 + Math.random() * 45;
    traffic.speed = (speedKmh * 1000) / 3600;

    this.scene.add(traffic.root);
    this.trafficCars.push(traffic);
  }

  private updateRoadChunks(playerZ: number) {
    // Keep 4 chunks looping around the player
    for (let i = 0; i < this.roadChunks.length; i++) {
      const chunk = this.roadChunks[i];
      if (chunk.root.position.z < playerZ - CHUNK_LENGTH * 1.5) {
        // Find front-most chunk position
        let maxZ = -Infinity;
        for (const c of this.roadChunks) {
          if (c.root.position.z > maxZ) maxZ = c.root.position.z;
        }
        chunk.root.position.z = maxZ + CHUNK_LENGTH;
      }
    }
  }

  private updateTraffic(dt: number, playerZ: number) {
    // Difficulty scale with distance
    const difficultyFactor = Math.min(this.distanceTraveled / 4000, 1.0);

    for (let i = this.trafficCars.length - 1; i >= 0; i--) {
      const tc = this.trafficCars[i];

      // Move forward
      const distDelta = tc.speed * dt;
      tc.root.position.z += distDelta;
      tc.updateWheelRotation(distDelta);

      // Dynamic lane changing
      tc.laneChangeTimer -= dt;
      if (tc.laneChangeTimer <= 0) {
        tc.laneChangeTimer = 4 + Math.random() * 8;
        // 35% chance to attempt lane change if not already changing
        if (Math.random() < 0.35 + difficultyFactor * 0.15) {
          const currentLaneIdx = LANE_CENTERS.indexOf(tc.targetLaneX);
          const possibleLanes: number[] = [];
          if (currentLaneIdx > 0) possibleLanes.push(LANE_CENTERS[currentLaneIdx - 1]);
          if (currentLaneIdx < LANE_CENTERS.length - 1) possibleLanes.push(LANE_CENTERS[currentLaneIdx + 1]);

          if (possibleLanes.length > 0) {
            tc.targetLaneX = possibleLanes[Math.floor(Math.random() * possibleLanes.length)];
            tc.isChangingLane = true;
          }
        }
      }

      // Smoothly interpolate lateral position
      if (Math.abs(tc.root.position.x - tc.targetLaneX) > 0.05) {
        const steerDir = Math.sign(tc.targetLaneX - tc.root.position.x);
        tc.root.position.x += steerDir * 2.2 * dt;
        tc.root.rotation.y = steerDir * 0.06;
      } else {
        tc.root.position.x = tc.targetLaneX;
        tc.root.rotation.y = 0;
        tc.isChangingLane = false;
      }

      // Despawn traffic car if far behind or too far ahead
      if (tc.root.position.z < playerZ - 45 || tc.root.position.z > playerZ + 320) {
        this.scene.remove(tc.root);
        this.activeNearMisses.delete(tc);
        this.trafficCars.splice(i, 1);
        continue;
      }

      // Check Near-Miss
      if (this.state === 'PLAYING' && !this.isCrashing) {
        const zDist = tc.root.position.z - playerZ;
        const xDist = Math.abs(tc.root.position.x - this.playerCar.root.position.x);

        // Near-miss triggers when player passes within 1.6m laterally and longitudinal distance is close
        if (Math.abs(zDist) < 3.2 && xDist < 2.3 && xDist > 1.2) {
          if (!this.activeNearMisses.has(tc) && this.speedKmh > 110) {
            this.triggerNearMiss(tc);
          }
        }
      }
    }

    // Maintain 7 to 9 traffic cars ahead
    const targetCount = 7 + Math.floor(difficultyFactor * 3);
    if (this.trafficCars.length < targetCount) {
      let maxAheadZ = playerZ + 70;
      for (const c of this.trafficCars) {
        if (c.root.position.z > maxAheadZ) maxAheadZ = c.root.position.z;
      }
      this.spawnTrafficCar(maxAheadZ + 25 + Math.random() * 30);
    }
  }

  private triggerNearMiss(tc: TrafficCarInstance) {
    this.activeNearMisses.add(tc);
    this.nearMissCount++;
    this.combo = Math.min(this.combo + 1, 8);
    this.comboTimer = 3.5; // Combo resets after 3.5 seconds of no near-misses

    const bonusPoints = 500 * this.combo;
    this.score += bonusPoints;
    this.turboCharge = Math.min(100, this.turboCharge + 18);

    // Audio & Screen Feedback
    soundManager.playNearMiss();
    this.cameraShakeIntensity = Math.max(this.cameraShakeIntensity, 0.25);

    this.onTelemetryUpdate({
      speedKmh: Math.round(this.speedKmh),
      rpm: Math.round(this.calculateRPM()),
      gear: this.calculateGear(),
      distanceMeters: Math.round(this.distanceTraveled),
      score: Math.round(this.score),
      highScore: Math.max(this.score, this.highScore),
      combo: this.combo,
      turbo: Math.round(this.turboCharge),
      isBoosting: this.isBoosting,
      nearMissCount: this.nearMissCount,
      laneIndex: this.targetLaneIndex,
      recentNearMiss: {
        points: bonusPoints,
        text: `+${bonusPoints} NEAR MISS! (${this.combo}x COMBO)`,
        timestamp: Date.now(),
      },
    });
  }

  private checkCollisions() {
    if (this.isCrashing || this.state !== 'PLAYING') return;

    const pPos = this.playerCar.root.position;
    // Player bounding box (slight padding for tight racing feel)
    _boxPlayer.min.set(pPos.x - 0.85, 0.1, pPos.z - 2.0);
    _boxPlayer.max.set(pPos.x + 0.85, 1.3, pPos.z + 2.0);

    for (const tc of this.trafficCars) {
      const tPos = tc.root.position;
      const halfW = (tc.width * 0.85) / 2;
      const halfL = (tc.length * 0.85) / 2;

      _boxTraffic.min.set(tPos.x - halfW, 0.1, tPos.z - halfL);
      _boxTraffic.max.set(tPos.x + halfW, 2.2, tPos.z + halfL);

      if (_boxPlayer.intersectsBox(_boxTraffic)) {
        this.triggerCrash(tc);
        break;
      }
    }
  }

  private triggerCrash(tc: TrafficCarInstance) {
    this.isCrashing = true;
    this.hitstopTimer = 0.06; // 60ms visceral hitstop
    soundManager.playCrash();

    // Large particle explosion
    const crashPoint = this.playerCar.root.position.clone().add(new THREE.Vector3(0, 0.6, 1.2));
    this.particleSystem.emitCrashExplosion(crashPoint);

    // Decaying camera shake
    this.cameraShakeIntensity = 1.2;

    // Crash spin physics
    const relativeSpeed = Math.max(20, this.speedKmh - (tc.speed * 3600) / 1000);
    const impulse = relativeSpeed * 0.15;
    const impactDir = Math.sign(this.playerCar.root.position.x - tc.root.position.x) || 1;

    this.crashVelocity.set(impactDir * 8, 4, -impulse * 0.5);
    this.crashAngularVelocity.set(
      (Math.random() - 0.5) * 6,
      impactDir * 12,
      (Math.random() - 0.5) * 6
    );

    // Transition to Game Over screen after 1.5 seconds of crash wreckage
    setTimeout(() => {
      this.state = 'GAMEOVER';
      if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem('turborush3d_highscore', String(Math.round(this.highScore)));
      }
      this.onGameOver(
        Math.round(this.score),
        Math.round(this.distanceTraveled),
        Math.round(this.topSpeedRecorded),
        this.nearMissCount
      );
    }, 1500);
  }

  private calculateRPM(): number {
    const s = this.speedKmh;
    if (s < 50) return 1500 + (s / 50) * 5500;
    if (s < 100) return 2500 + ((s - 50) / 50) * 5000;
    if (s < 155) return 3000 + ((s - 100) / 55) * 5000;
    if (s < 210) return 3500 + ((s - 155) / 55) * 4800;
    return 4200 + ((s - 210) / 70) * 4500;
  }

  private calculateGear(): number {
    const s = this.speedKmh;
    if (s < 45) return 1;
    if (s < 90) return 2;
    if (s < 140) return 3;
    if (s < 195) return 4;
    if (s < 240) return 5;
    return 6;
  }

  private updatePlayerMovement(dt: number) {
    if (this.isCrashing) {
      // Wreckage simulation
      this.playerCar.root.position.addScaledVector(this.crashVelocity, dt);
      this.playerCar.root.rotation.x += this.crashAngularVelocity.x * dt;
      this.playerCar.root.rotation.y += this.crashAngularVelocity.y * dt;
      this.playerCar.root.rotation.z += this.crashAngularVelocity.z * dt;

      // Gravity & Ground bounce
      this.crashVelocity.y -= 14 * dt;
      if (this.playerCar.root.position.y <= 0.36) {
        this.playerCar.root.position.y = 0.36;
        this.crashVelocity.y = Math.abs(this.crashVelocity.y) * 0.3;
        this.crashVelocity.x *= 0.85;
      }

      this.speedKmh = Math.max(0, this.speedKmh - 120 * dt);
      return;
    }

    // Input processing
    const isAccel = this.inputs.accelerate;
    const isBraking = this.inputs.brake;
    const wantsTurbo = this.inputs.turbo && this.turboCharge > 5;

    // Turbo Boost handling
    if (wantsTurbo && isAccel) {
      this.isBoosting = true;
      this.turboCharge = Math.max(0, this.turboCharge - 24 * dt);
      this.targetSpeedKmh = 275;
    } else {
      this.isBoosting = false;
      // Passive turbo recharge
      this.turboCharge = Math.min(100, this.turboCharge + 2.5 * dt);

      if (isAccel) {
        this.targetSpeedKmh = 230;
      } else if (isBraking) {
        this.targetSpeedKmh = 30;
      } else {
        // Cruising highway momentum
        this.targetSpeedKmh = 120;
      }
    }

    // Acceleration & Deceleration physics
    const accelRate = this.isBoosting ? 140 : isAccel ? 75 : isBraking ? 160 : 35;
    if (this.speedKmh < this.targetSpeedKmh) {
      this.speedKmh = Math.min(this.targetSpeedKmh, this.speedKmh + accelRate * dt);
    } else {
      this.speedKmh = Math.max(this.targetSpeedKmh, this.speedKmh - accelRate * dt);
    }

    if (this.speedKmh > this.topSpeedRecorded) {
      this.topSpeedRecorded = this.speedKmh;
    }

    // Steering Physics: Three-Lane highway navigation (Left: -3.7, Center: 0.0, Right: +3.7)
    // Continuous steering holding support:
    if (this.inputs.steerLeft && !this.inputs.steerRight) {
      if (this.laneHoldTimer > 0) {
        this.laneHoldTimer -= dt;
      } else if (this.targetLaneIndex > 0) {
        const currentTargetX = LANE_CENTERS[this.targetLaneIndex];
        // Once within 1.0m of current target lane, advance to next left lane
        if (Math.abs(this.playerCar.root.position.x - currentTargetX) < 1.0) {
          this.targetLaneIndex -= 1;
          this.laneHoldTimer = 0.24;
        }
      }
    } else if (this.inputs.steerRight && !this.inputs.steerLeft) {
      if (this.laneHoldTimer > 0) {
        this.laneHoldTimer -= dt;
      } else if (this.targetLaneIndex < 2) {
        const currentTargetX = LANE_CENTERS[this.targetLaneIndex];
        // Once within 1.0m of current target lane, advance to next right lane
        if (Math.abs(this.playerCar.root.position.x - currentTargetX) < 1.0) {
          this.targetLaneIndex += 1;
          this.laneHoldTimer = 0.24;
        }
      }
    } else {
      this.laneHoldTimer = 0;
    }

    // Target lane coordinate: Left (-3.7), Center (0.0), Right (+3.7)
    const pPos = this.playerCar.root.position;
    const targetX = LANE_CENTERS[this.targetLaneIndex];
    const prevX = pPos.x;

    // Smoothly and responsively glide towards target lane
    pPos.x = THREE.MathUtils.damp(pPos.x, targetX, 13, dt);

    // Clean snap when aligned with lane center
    if (Math.abs(pPos.x - targetX) < 0.015) {
      pPos.x = targetX;
      this.currentLaneIndex = this.targetLaneIndex;
    }

    // Strict boundary enforcement: car NEVER goes outside the road
    pPos.x = Math.max(LANE_CENTERS[0], Math.min(LANE_CENTERS[2], pPos.x));

    // Calculate actual lateral movement velocity
    const frameLateralVel = (pPos.x - prevX) / Math.max(dt, 0.0001);
    this.lateralVelocity = THREE.MathUtils.damp(this.lateralVelocity, frameLateralVel, 12, dt);

    // Update Player Car position forward
    const speedMs = (this.speedKmh * 1000) / 3600;
    const distDelta = speedMs * dt;
    this.distanceTraveled += distDelta;
    pPos.z += distDelta;

    // Smooth Steering Animations:
    // Left movement (lateralVelocity < 0): front wheels turn left (negative angle)
    // Right movement (lateralVelocity > 0): front wheels turn right (positive angle)
    // Centered in lane (lateralVelocity ≈ 0): front wheels face straight forward (0 angle)
    const targetSteerAngle = Math.max(-0.25, Math.min(0.25, this.lateralVelocity * 0.022));
    this.currentSteerAngle = THREE.MathUtils.damp(this.currentSteerAngle, targetSteerAngle, 14, dt);

    // Subtle momentary body yaw (turns slightly towards target lane during movement, returns to 0 when in lane)
    const targetYaw = Math.max(-0.06, Math.min(0.06, this.lateralVelocity * 0.005));
    const currentYaw = THREE.MathUtils.damp(this.playerCar.root.rotation.y, targetYaw, 12, dt);

    // Subtle roll tilt into the turn
    const targetTilt = Math.max(-0.025, Math.min(0.025, this.lateralVelocity * 0.0025));
    this.carTiltAngle = THREE.MathUtils.damp(this.carTiltAngle, targetTilt, 10, dt);

    // Pitch tilt on acceleration/braking
    const targetPitch = isBraking ? 0.04 : isAccel ? -0.03 : 0;
    this.carPitchAngle = THREE.MathUtils.damp(this.carPitchAngle, targetPitch, 8, dt);

    // Keep car facing forward when settled in lane
    this.playerCar.root.rotation.set(this.carPitchAngle, currentYaw, this.carTiltAngle);

    // Update wheels rotation and steering
    this.playerCar.updateWheelRotation(distDelta, this.currentSteerAngle);
    this.playerCar.setBraking(isBraking);
    this.playerCar.setBoosting(this.isBoosting);

    // Exhaust & Tire Smoke Particles
    if (this.isBoosting || isAccel) {
      _vec3A.set(pPos.x, 0.2, pPos.z - 2.1);
      this.particleSystem.emitExhaustSmoke(_vec3A, this.isBoosting);
    }

    if (isBraking && this.speedKmh > 60) {
      _vec3A.set(pPos.x - 0.8, 0.1, pPos.z - 1.4);
      _vec3B.set(pPos.x + 0.8, 0.1, pPos.z - 1.4);
      this.particleSystem.emitTireSmoke(_vec3A);
      this.particleSystem.emitTireSmoke(_vec3B);
    }

    // Audio synthesis update
    soundManager.updateEngineSound(this.speedKmh, isAccel, isBraking, this.isBoosting);

    // Score accumulation (distance + speed multiplier)
    const speedMultiplier = Math.max(1, this.speedKmh / 100);
    this.score += distDelta * speedMultiplier * this.combo * 0.6;

    // Combo timer decay
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 1;
      }
    }
  }

  private updateCamera(dt: number) {
    if (this.state === 'MENU') {
      // Orbiting cinematic showcase around player car
      this.menuOrbitAngle += dt * 0.45;
      const radius = 6.2;
      const height = 2.1;
      this.camera.position.set(
        Math.sin(this.menuOrbitAngle) * radius,
        height,
        Math.cos(this.menuOrbitAngle) * radius
      );
      this.camera.lookAt(0, 0.7, 0);
      this.camera.fov = 50;
      this.camera.updateProjectionMatrix();
      return;
    }

    const pPos = this.playerCar.root.position;

    // Smooth Chase Camera
    const targetCamX = pPos.x * 0.65;
    const targetCamY = pPos.y + 2.75;
    const targetCamZ = pPos.z - 6.8;

    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, targetCamX, 9, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, targetCamY, 7, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, targetCamZ, 12, dt);

    // Speed-dependent dynamic FOV (60 at 0 km/h -> 78 at 270 km/h)
    const targetFov = 62 + (this.speedKmh / 270) * 16;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 4, dt);
    this.camera.updateProjectionMatrix();

    // Look slightly ahead of car
    const lookTargetZ = pPos.z + 18 + this.speedKmh * 0.05;
    this.camera.lookAt(pPos.x * 0.3, pPos.y + 1.2, lookTargetZ);

    // Camera Shake
    if (this.cameraShakeIntensity > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * this.cameraShakeIntensity;
      this.camera.position.y += (Math.random() - 0.5) * this.cameraShakeIntensity;
      this.cameraShakeIntensity = THREE.MathUtils.damp(this.cameraShakeIntensity, 0, 5, dt);
    }

    // Follow light with player
    this.dirLight.position.set(pPos.x + 35, 65, pPos.z + 40);
    this.dirLight.target.position.set(pPos.x, 0, pPos.z + 15);
  }

  private tick(now: number) {
    if (!this.isRunning) return;

    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const dt = Math.min(rawDt, 0.05); // Clamp dt to prevent tunneling

    // Hitstop freeze for heavy collision impacts
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.renderer.render(this.scene, this.camera);
      this.animationFrameId = requestAnimationFrame(this.tick);
      return;
    }

    if (this.state === 'PLAYING') {
      this.updatePlayerMovement(dt);
      this.updateRoadChunks(this.playerCar.root.position.z);
      this.updateTraffic(dt, this.playerCar.root.position.z);
      this.checkCollisions();

      // Emit telemetry updates for HUD
      this.onTelemetryUpdate({
        speedKmh: Math.round(this.speedKmh),
        rpm: Math.round(this.calculateRPM()),
        gear: this.calculateGear(),
        distanceMeters: Math.round(this.distanceTraveled),
        score: Math.round(this.score),
        highScore: Math.max(this.score, this.highScore),
        combo: this.combo,
        turbo: Math.round(this.turboCharge),
        isBoosting: this.isBoosting,
        nearMissCount: this.nearMissCount,
        laneIndex: this.targetLaneIndex,
        recentNearMiss: null,
      });
    }

    this.particleSystem.update(dt);
    this.updateCamera(dt);

    this.renderer.render(this.scene, this.camera);

    this.animationFrameId = requestAnimationFrame(this.tick);
  }

  private onResize = () => {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  public dispose() {
    this.isRunning = false;
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.onResize);
    soundManager.stopEngine();

    this.particleSystem.dispose();
    this.clearTraffic();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
