import * as THREE from 'three';

/**
 * Procedural 3D model generator for TURBO RUSH 3D
 * Compliant with Three.js Skill Directives:
 * - 3 to 12 distinct parts per composite model
 * - Distinct metalness/roughness across body, glass, chrome, and rubber
 * - Bottom-center grounded pivots
 * - Zero 404 external asset dependencies
 */

// Procedural road canvas texture generator
export function createAsphaltTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // 1. Dark asphalt base with subtle aggregate noise
  ctx.fillStyle = '#1c1e22';
  ctx.fillRect(0, 0, 1024, 1024);

  // Noise speckles
  const imgData = ctx.getImageData(0, 0, 1024, 1024);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 22;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);

  // 2. Road markings (3 lanes: left lane edge, 2 dashed dividers, right lane edge)
  // Road width in UV: lane width = ~260px, shoulders = ~120px each
  // Left shoulder line (solid white)
  ctx.fillStyle = '#e8ecf0';
  ctx.fillRect(110, 0, 14, 1024);

  // Right shoulder line (solid yellow)
  ctx.fillStyle = '#ffcc00';
  ctx.fillRect(900, 0, 14, 1024);

  // Lane dividers (dashed white lines at ~373px and ~637px)
  ctx.fillStyle = '#f0f3f6';
  const dashLength = 120;
  const dashGap = 90;
  const totalPeriod = dashLength + dashGap;

  for (let y = 0; y < 1024; y += totalPeriod) {
    ctx.fillRect(373, y, 10, dashLength);
    ctx.fillRect(637, y, 10, dashLength);
  }

  // Edge rumble strip stripes on outer shoulder
  for (let y = 0; y < 1024; y += 40) {
    ctx.fillStyle = (y / 40) % 2 === 0 ? '#cc292b' : '#f0f0f0';
    ctx.fillRect(80, y, 22, 20);
    ctx.fillRect(922, y, 22, 20);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Procedural contact shadow texture
export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 256, 256);
  const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 110);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
  grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.4)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(128, 128, 110, 75, 0, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// Shared wheel generator with alloy rim, tire tread, and brake caliper
export function createWheel(radius = 0.36, width = 0.26): {
  wheelGroup: THREE.Group;
  rimGroup: THREE.Group;
} {
  const wheelGroup = new THREE.Group();
  const rimGroup = new THREE.Group();

  // 1. Rubber tire
  const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 24);
  tireGeo.rotateZ(Math.PI / 2);
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x18191c,
    roughness: 0.85,
    metalness: 0.1,
  });
  const tireMesh = new THREE.Mesh(tireGeo, tireMat);
  tireMesh.castShadow = true;
  rimGroup.add(tireMesh);

  // 2. Alloy Rim
  const rimGeo = new THREE.CylinderGeometry(radius * 0.72, radius * 0.72, width * 1.02, 16);
  rimGeo.rotateZ(Math.PI / 2);
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xd8dce3,
    roughness: 0.2,
    metalness: 0.9,
  });
  const rimMesh = new THREE.Mesh(rimGeo, rimMat);
  rimGroup.add(rimMesh);

  // 3. Rim 5-spoke star detail
  const spokeMat = new THREE.MeshStandardMaterial({
    color: 0x22262e,
    roughness: 0.3,
    metalness: 0.8,
  });
  for (let i = 0; i < 5; i++) {
    const angle = (i * Math.PI * 2) / 5;
    const spokeGeo = new THREE.BoxGeometry(width * 1.04, radius * 0.65, 0.04);
    const spokeMesh = new THREE.Mesh(spokeGeo, spokeMat);
    spokeMesh.rotation.x = angle;
    rimGroup.add(spokeMesh);
  }

  // 4. Center hub cap
  const hubGeo = new THREE.CylinderGeometry(radius * 0.22, radius * 0.22, width * 1.06, 12);
  hubGeo.rotateZ(Math.PI / 2);
  const hubMesh = new THREE.Mesh(hubGeo, spokeMat);
  rimGroup.add(hubMesh);

  // 5. Stationary Brake Caliper (red sport caliper) - stays stationary while wheel spins
  const caliperGeo = new THREE.BoxGeometry(width * 0.6, radius * 0.45, radius * 0.25);
  const caliperMat = new THREE.MeshStandardMaterial({
    color: 0xe62020,
    roughness: 0.35,
    metalness: 0.6,
  });
  const caliperMesh = new THREE.Mesh(caliperGeo, caliperMat);
  caliperMesh.position.set(0, radius * 0.4, 0);

  wheelGroup.add(rimGroup);
  wheelGroup.add(caliperMesh);

  return { wheelGroup, rimGroup };
}

export interface PlayerCarInstance {
  root: THREE.Group;
  bodyMesh: THREE.Mesh;
  bodyMaterial: THREE.MeshPhysicalMaterial;
  flWheel: THREE.Group;
  frWheel: THREE.Group;
  rlWheel: THREE.Group;
  rrWheel: THREE.Group;
  flRim: THREE.Group;
  frRim: THREE.Group;
  rlRim: THREE.Group;
  rrRim: THREE.Group;
  exhaustLeft: THREE.Mesh;
  exhaustRight: THREE.Mesh;
  headlights: THREE.Mesh[];
  taillights: THREE.Mesh;
  taillightMaterial: THREE.MeshStandardMaterial;
  headlightLight: THREE.SpotLight;
  nitrousFlames: THREE.Group;
  updateWheelRotation: (distanceDelta: number, steerAngle: number) => void;
  setBraking: (isBraking: boolean) => void;
  setBoosting: (isBoosting: boolean) => void;
  setPaintColor: (hex: number) => void;
}

// ----------------------------------------------------
// PLAYER CAR: HIGH-PERFORMANCE PROCEDURAL SPORTS CAR
// ----------------------------------------------------
export function createPlayerCar(paintHex = 0xd91b24): PlayerCarInstance {
  const root = new THREE.Group();
  root.name = 'PlayerCar';

  // Body Dimensions
  const carLength = 4.4;
  const carWidth = 1.95;
  const carHeight = 1.15;
  const groundOffset = 0.36; // Wheel radius

  // 1. Sleek Aerodynamic Main Chassis Body
  const bodyShape = new THREE.Shape();
  // Side silhouette profile (Z forward/back, Y up/down)
  bodyShape.moveTo(-2.2, 0.2); // Rear bumper
  bodyShape.lineTo(-2.1, 0.55); // Rear deck
  bodyShape.lineTo(-1.2, 0.65); // Rear window base
  bodyShape.lineTo(-0.4, 1.05); // Roof rear
  bodyShape.lineTo(0.5, 1.05);  // Roof front
  bodyShape.lineTo(1.4, 0.6);   // Hood base / windshield base
  bodyShape.lineTo(2.15, 0.45); // Front nose tip
  bodyShape.lineTo(2.2, 0.15);  // Front splitter bottom
  bodyShape.lineTo(-2.2, 0.15); // Underside flat floor
  bodyShape.closePath();

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    steps: 1,
    depth: carWidth * 0.9,
    bevelEnabled: true,
    bevelThickness: 0.12,
    bevelSize: 0.1,
    bevelSegments: 4,
  };

  const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, extrudeSettings);
  // Center geometry
  bodyGeo.center();
  bodyGeo.rotateY(Math.PI / 2); // Align forward along Z

  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: paintHex,
    metalness: 0.75,
    roughness: 0.18,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
  });

  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMaterial);
  bodyMesh.position.y = groundOffset + 0.35;
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  root.add(bodyMesh);

  // 2. Glossy Cabin Glass (Windshield, roof, rear & side windows)
  const cabinGeo = new THREE.BoxGeometry(carWidth * 0.82, 0.58, 1.8);
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x111625,
    metalness: 0.9,
    roughness: 0.1,
    transmission: 0.35,
    transparent: true,
    opacity: 0.85,
  });
  const cabinMesh = new THREE.Mesh(cabinGeo, glassMaterial);
  cabinMesh.position.set(0, groundOffset + 0.72, -0.05);
  root.add(cabinMesh);

  // 3. Carbon Fiber Front Splitter & Aerodynamic Air Dam
  const splitterGeo = new THREE.BoxGeometry(carWidth * 1.02, 0.08, 0.6);
  const carbonMaterial = new THREE.MeshStandardMaterial({
    color: 0x151618,
    roughness: 0.45,
    metalness: 0.8,
  });
  const splitterMesh = new THREE.Mesh(splitterGeo, carbonMaterial);
  splitterMesh.position.set(0, groundOffset + 0.1, 1.95);
  splitterMesh.castShadow = true;
  root.add(splitterMesh);

  // 4. Aggressive Honeycomb Front Radiator Grille
  const grilleGeo = new THREE.BoxGeometry(carWidth * 0.68, 0.22, 0.1);
  const grilleMat = new THREE.MeshStandardMaterial({
    color: 0x0a0a0c,
    roughness: 0.9,
    metalness: 0.2,
  });
  const grilleMesh = new THREE.Mesh(grilleGeo, grilleMat);
  grilleMesh.position.set(0, groundOffset + 0.28, 2.18);
  root.add(grilleMesh);

  // 5. LED Headlights (Angular sports clusters)
  const headlightGeo = new THREE.BoxGeometry(0.38, 0.1, 0.12);
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xccf0ff,
    emissiveIntensity: 2.5,
    roughness: 0.1,
  });

  const leftHeadlight = new THREE.Mesh(headlightGeo, headlightMat);
  leftHeadlight.position.set(-0.68, groundOffset + 0.42, 2.14);
  leftHeadlight.rotation.y = -0.15;
  root.add(leftHeadlight);

  const rightHeadlight = new THREE.Mesh(headlightGeo, headlightMat);
  rightHeadlight.position.set(0.68, groundOffset + 0.42, 2.14);
  rightHeadlight.rotation.y = 0.15;
  root.add(rightHeadlight);

  // Headlight beam spotlight
  const headlightLight = new THREE.SpotLight(0xecf8ff, 4.0, 50, Math.PI / 5, 0.4, 1.2);
  headlightLight.position.set(0, groundOffset + 0.5, 2.2);
  const lightTarget = new THREE.Object3D();
  lightTarget.position.set(0, groundOffset, 15);
  root.add(lightTarget);
  headlightLight.target = lightTarget;
  root.add(headlightLight);

  // 6. Rear Emissive Taillight Neon Strip
  const taillightGeo = new THREE.BoxGeometry(carWidth * 0.88, 0.08, 0.1);
  const taillightMaterial = new THREE.MeshStandardMaterial({
    color: 0x990000,
    emissive: 0xff1010,
    emissiveIntensity: 1.8,
    roughness: 0.2,
  });
  const taillightMesh = new THREE.Mesh(taillightGeo, taillightMaterial);
  taillightMesh.position.set(0, groundOffset + 0.55, -2.16);
  root.add(taillightMesh);

  // 7. Carbon Fiber Racing Rear GT Spoiler Wing
  const spoilerWingGeo = new THREE.BoxGeometry(carWidth * 0.95, 0.05, 0.35);
  const spoilerWing = new THREE.Mesh(spoilerWingGeo, carbonMaterial);
  spoilerWing.position.set(0, groundOffset + 0.96, -1.9);
  spoilerWing.castShadow = true;
  root.add(spoilerWing);

  // Wing upright struts
  const strutGeo = new THREE.BoxGeometry(0.04, 0.32, 0.18);
  const leftStrut = new THREE.Mesh(strutGeo, carbonMaterial);
  leftStrut.position.set(-0.55, groundOffset + 0.8, -1.9);
  root.add(leftStrut);
  const rightStrut = new THREE.Mesh(strutGeo, carbonMaterial);
  rightStrut.position.set(0.55, groundOffset + 0.8, -1.9);
  root.add(rightStrut);

  // 8. Quad Chrome Exhaust Tips
  const exhaustGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.2, 12);
  exhaustGeo.rotateX(Math.PI / 2);
  const exhaustMat = new THREE.MeshStandardMaterial({
    color: 0xeeeeee,
    metalness: 0.95,
    roughness: 0.15,
  });

  const exhaustLeft = new THREE.Mesh(exhaustGeo, exhaustMat);
  exhaustLeft.position.set(-0.55, groundOffset + 0.18, -2.15);
  root.add(exhaustLeft);

  const exhaustRight = new THREE.Mesh(exhaustGeo, exhaustMat);
  exhaustRight.position.set(0.55, groundOffset + 0.18, -2.15);
  root.add(exhaustRight);

  // 9. Nitrous / Turbo Flame Jet cones (hidden by default, scaled during boost)
  const nitrousFlames = new THREE.Group();
  const flameGeo = new THREE.ConeGeometry(0.12, 0.8, 8);
  flameGeo.rotateX(-Math.PI / 2);
  const flameMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.85,
  });
  const leftFlame = new THREE.Mesh(flameGeo, flameMat);
  leftFlame.position.set(-0.55, groundOffset + 0.18, -2.55);
  nitrousFlames.add(leftFlame);

  const rightFlame = new THREE.Mesh(flameGeo, flameMat);
  rightFlame.position.set(0.55, groundOffset + 0.18, -2.55);
  nitrousFlames.add(rightFlame);
  nitrousFlames.visible = false;
  root.add(nitrousFlames);

  // 10. Four High-Detail Wheels
  const wheelRadius = 0.36;
  const wheelTrack = carWidth * 0.49;
  const wheelbaseFront = 1.35;
  const wheelbaseRear = -1.35;

  const fl = createWheel(wheelRadius, 0.28);
  fl.wheelGroup.position.set(-wheelTrack, wheelRadius, wheelbaseFront);
  root.add(fl.wheelGroup);

  const fr = createWheel(wheelRadius, 0.28);
  fr.wheelGroup.position.set(wheelTrack, wheelRadius, wheelbaseFront);
  fr.wheelGroup.rotation.y = Math.PI; // Invert for right side
  root.add(fr.wheelGroup);

  const rl = createWheel(wheelRadius, 0.32);
  rl.wheelGroup.position.set(-wheelTrack, wheelRadius, wheelbaseRear);
  root.add(rl.wheelGroup);

  const rr = createWheel(wheelRadius, 0.32);
  rr.wheelGroup.position.set(wheelTrack, wheelRadius, wheelbaseRear);
  rr.wheelGroup.rotation.y = Math.PI;
  root.add(rr.wheelGroup);

  // 11. Soft Contact Shadow Plane Grounding
  const shadowGeo = new THREE.PlaneGeometry(carWidth * 1.3, carLength * 1.15);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowTex = createContactShadowTexture();
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.position.y = 0.02;
  root.add(shadowMesh);

  // Wheel animation helpers
  let totalWheelRotation = 0;
  const updateWheelRotation = (distanceDelta: number, steerAngle: number) => {
    const angleDelta = distanceDelta / wheelRadius;
    totalWheelRotation += angleDelta;

    // Rotate rims
    fl.rimGroup.rotation.x = totalWheelRotation;
    fr.rimGroup.rotation.x = -totalWheelRotation;
    rl.rimGroup.rotation.x = totalWheelRotation;
    rr.rimGroup.rotation.x = -totalWheelRotation;

    // Steer front wheels
    fl.wheelGroup.rotation.y = steerAngle;
    fr.wheelGroup.rotation.y = Math.PI + steerAngle;
  };

  const setBraking = (isBraking: boolean) => {
    taillightMaterial.emissiveIntensity = isBraking ? 4.5 : 1.8;
  };

  const setBoosting = (isBoosting: boolean) => {
    nitrousFlames.visible = isBoosting;
    if (isBoosting) {
      const flicker = 0.7 + Math.random() * 0.5;
      nitrousFlames.scale.set(flicker, flicker, flicker * 1.3);
    }
  };

  const setPaintColor = (hex: number) => {
    bodyMaterial.color.setHex(hex);
  };

  return {
    root,
    bodyMesh,
    bodyMaterial,
    flWheel: fl.wheelGroup,
    frWheel: fr.wheelGroup,
    rlWheel: rl.wheelGroup,
    rrWheel: rr.wheelGroup,
    flRim: fl.rimGroup,
    frRim: fr.rimGroup,
    rlRim: rl.rimGroup,
    rrRim: rr.rimGroup,
    exhaustLeft,
    exhaustRight,
    headlights: [leftHeadlight, rightHeadlight],
    taillights: taillightMesh,
    taillightMaterial,
    headlightLight,
    nitrousFlames,
    updateWheelRotation,
    setBraking,
    setBoosting,
    setPaintColor,
  };
}

// ----------------------------------------------------
// TRAFFIC VEHICLES (4 DIVERSE DISTINCT STYLES)
// ----------------------------------------------------
export type TrafficType = 'SEDAN' | 'SUV' | 'SUPERCAR' | 'TRUCK';

export interface TrafficCarInstance {
  root: THREE.Group;
  type: TrafficType;
  rims: THREE.Group[];
  wheelRadius: number;
  width: number;
  length: number;
  speed: number; // world units / sec
  targetLaneX: number;
  currentLaneX: number;
  isChangingLane: boolean;
  laneChangeTimer: number;
  updateWheelRotation: (distanceDelta: number) => void;
}

export function createTrafficVehicle(type: TrafficType, colorHex: number): TrafficCarInstance {
  const root = new THREE.Group();
  const rims: THREE.Group[] = [];
  let wheelRadius = 0.35;
  let carWidth = 1.9;
  let carLength = 4.3;

  const shadowTex = createContactShadowTexture();

  if (type === 'TRUCK') {
    wheelRadius = 0.5;
    carWidth = 2.4;
    carLength = 9.0;

    // Semi-truck tractor cab + cargo trailer
    // 1. Tractor cab
    const cabGeo = new THREE.BoxGeometry(2.3, 2.2, 2.6);
    const cabMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      metalness: 0.6,
      roughness: 0.3,
    });
    const cab = new THREE.Mesh(cabGeo, cabMat);
    cab.position.set(0, 1.4, 2.8);
    cab.castShadow = true;
    root.add(cab);

    // Cab windshield
    const cabWindshieldGeo = new THREE.BoxGeometry(2.1, 0.8, 0.1);
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x111620, roughness: 0.1, metalness: 0.9 });
    const cabWindshield = new THREE.Mesh(cabWindshieldGeo, glassMat);
    cabWindshield.position.set(0, 1.8, 4.12);
    root.add(cabWindshield);

    // Chrome vertical exhaust stacks
    const stackGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.2, 12);
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.95, roughness: 0.1 });
    const leftStack = new THREE.Mesh(stackGeo, chromeMat);
    leftStack.position.set(-1.1, 2.2, 1.5);
    root.add(leftStack);
    const rightStack = new THREE.Mesh(stackGeo, chromeMat);
    rightStack.position.set(1.1, 2.2, 1.5);
    root.add(rightStack);

    // 2. Large Cargo Trailer container
    const trailerGeo = new THREE.BoxGeometry(2.35, 2.6, 5.8);
    const trailerMat = new THREE.MeshStandardMaterial({
      color: 0xdedede,
      roughness: 0.4,
      metalness: 0.2,
    });
    const trailer = new THREE.Mesh(trailerGeo, trailerMat);
    trailer.position.set(0, 1.7, -1.5);
    trailer.castShadow = true;
    root.add(trailer);

    // Hazard stripes on rear trailer
    const hazardGeo = new THREE.BoxGeometry(2.3, 0.3, 0.05);
    const hazardMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0x664400, roughness: 0.5 });
    const hazard = new THREE.Mesh(hazardGeo, hazardMat);
    hazard.position.set(0, 0.7, -4.42);
    root.add(hazard);

    // Taillights
    const tlGeo = new THREE.BoxGeometry(0.35, 0.15, 0.05);
    const tlMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xee0000, emissiveIntensity: 2.0 });
    const tlL = new THREE.Mesh(tlGeo, tlMat);
    tlL.position.set(-0.85, 0.7, -4.43);
    root.add(tlL);
    const tlR = new THREE.Mesh(tlGeo, tlMat);
    tlR.position.set(0.85, 0.7, -4.43);
    root.add(tlR);

    // 6 Wheels for Semi-Truck
    const wheelPositions = [
      [-1.15, 0.5, 3.2],
      [1.15, 0.5, 3.2],
      [-1.15, 0.5, -2.8],
      [1.15, 0.5, -2.8],
      [-1.15, 0.5, -3.9],
      [1.15, 0.5, -3.9],
    ];

    wheelPositions.forEach((pos, idx) => {
      const w = createWheel(wheelRadius, 0.32);
      w.wheelGroup.position.set(pos[0], pos[1], pos[2]);
      if (pos[0] > 0) w.wheelGroup.rotation.y = Math.PI;
      root.add(w.wheelGroup);
      rims.push(w.rimGroup);
    });
  } else if (type === 'SUV') {
    wheelRadius = 0.38;
    carWidth = 2.05;
    carLength = 4.6;

    // SUV Boxy chassis
    const suvBodyGeo = new THREE.BoxGeometry(1.95, 0.9, 4.4);
    const suvBodyMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      metalness: 0.65,
      roughness: 0.25,
    });
    const suvBody = new THREE.Mesh(suvBodyGeo, suvBodyMat);
    suvBody.position.set(0, 0.85, 0);
    suvBody.castShadow = true;
    root.add(suvBody);

    // SUV Cabin / Roof
    const suvCabinGeo = new THREE.BoxGeometry(1.8, 0.75, 2.7);
    const suvCabin = new THREE.Mesh(suvCabinGeo, suvBodyMat);
    suvCabin.position.set(0, 1.5, -0.2);
    suvCabin.castShadow = true;
    root.add(suvCabin);

    // SUV Windows
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x121720, roughness: 0.1, metalness: 0.9 });
    const sideGlassGeo = new THREE.BoxGeometry(1.84, 0.5, 2.4);
    const sideGlass = new THREE.Mesh(sideGlassGeo, glassMat);
    sideGlass.position.set(0, 1.5, -0.2);
    root.add(sideGlass);

    // Roof Luggage Rails
    const railMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.8 });
    const railGeo = new THREE.BoxGeometry(0.08, 0.08, 2.4);
    const railL = new THREE.Mesh(railGeo, railMat);
    railL.position.set(-0.75, 1.92, -0.2);
    root.add(railL);
    const railR = new THREE.Mesh(railGeo, railMat);
    railR.position.set(0.75, 1.92, -0.2);
    root.add(railR);

    // Taillights
    const tlGeo = new THREE.BoxGeometry(0.3, 0.5, 0.06);
    const tlMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xdd1111, emissiveIntensity: 2.0 });
    const tlL = new THREE.Mesh(tlGeo, tlMat);
    tlL.position.set(-0.75, 1.1, -2.22);
    root.add(tlL);
    const tlR = new THREE.Mesh(tlGeo, tlMat);
    tlR.position.set(0.75, 1.1, -2.22);
    root.add(tlR);

    // 4 Wheels
    [
      [-0.98, 0.38, 1.3],
      [0.98, 0.38, 1.3],
      [-0.98, 0.38, -1.3],
      [0.98, 0.38, -1.3],
    ].forEach((pos) => {
      const w = createWheel(wheelRadius, 0.3);
      w.wheelGroup.position.set(pos[0], pos[1], pos[2]);
      if (pos[0] > 0) w.wheelGroup.rotation.y = Math.PI;
      root.add(w.wheelGroup);
      rims.push(w.rimGroup);
    });
  } else if (type === 'SUPERCAR') {
    wheelRadius = 0.34;
    carWidth = 2.0;
    carLength = 4.4;

    // Low exotic profile
    const bodyGeo = new THREE.BoxGeometry(1.9, 0.45, 4.2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      metalness: 0.8,
      roughness: 0.2,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 0.5, 0);
    body.castShadow = true;
    root.add(body);

    // Cockpit dome
    const cockpitGeo = new THREE.ConeGeometry(0.9, 1.7, 5);
    cockpitGeo.rotateX(Math.PI / 2);
    cockpitGeo.scale(1.7, 0.45, 1.3);
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f141d, roughness: 0.1, metalness: 0.95 });
    const cockpit = new THREE.Mesh(cockpitGeo, glassMat);
    cockpit.position.set(0, 0.85, -0.2);
    root.add(cockpit);

    // High GT wing
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5, metalness: 0.7 });
    const wingGeo = new THREE.BoxGeometry(1.9, 0.04, 0.35);
    const wing = new THREE.Mesh(wingGeo, wingMat);
    wing.position.set(0, 0.95, -1.9);
    root.add(wing);

    // Taillight bar
    const tlGeo = new THREE.BoxGeometry(1.6, 0.06, 0.05);
    const tlMat = new THREE.MeshStandardMaterial({ color: 0xff0022, emissive: 0xff0022, emissiveIntensity: 2.2 });
    const tl = new THREE.Mesh(tlGeo, tlMat);
    tl.position.set(0, 0.55, -2.12);
    root.add(tl);

    // 4 Wheels
    [
      [-0.95, 0.34, 1.3],
      [0.95, 0.34, 1.3],
      [-0.95, 0.34, -1.3],
      [0.95, 0.34, -1.3],
    ].forEach((pos) => {
      const w = createWheel(wheelRadius, 0.28);
      w.wheelGroup.position.set(pos[0], pos[1], pos[2]);
      if (pos[0] > 0) w.wheelGroup.rotation.y = Math.PI;
      root.add(w.wheelGroup);
      rims.push(w.rimGroup);
    });
  } else {
    // Standard Sports Sedan
    wheelRadius = 0.35;
    carWidth = 1.85;
    carLength = 4.3;

    const lowerGeo = new THREE.BoxGeometry(1.8, 0.6, 4.2);
    const lowerMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      metalness: 0.7,
      roughness: 0.25,
    });
    const lower = new THREE.Mesh(lowerGeo, lowerMat);
    lower.position.set(0, 0.65, 0);
    lower.castShadow = true;
    root.add(lower);

    // Upper cabin
    const cabinGeo = new THREE.BoxGeometry(1.6, 0.55, 2.2);
    const cabin = new THREE.Mesh(cabinGeo, lowerMat);
    cabin.position.set(0, 1.15, -0.2);
    cabin.castShadow = true;
    root.add(cabin);

    // Tinted windows
    const winGeo = new THREE.BoxGeometry(1.64, 0.42, 2.0);
    const winMat = new THREE.MeshStandardMaterial({ color: 0x161c28, roughness: 0.15, metalness: 0.85 });
    const win = new THREE.Mesh(winGeo, winMat);
    win.position.set(0, 1.15, -0.2);
    root.add(win);

    // Taillights
    const tlGeo = new THREE.BoxGeometry(0.4, 0.14, 0.06);
    const tlMat = new THREE.MeshStandardMaterial({ color: 0xff1111, emissive: 0xee1111, emissiveIntensity: 2.0 });
    const tlL = new THREE.Mesh(tlGeo, tlMat);
    tlL.position.set(-0.65, 0.75, -2.12);
    root.add(tlL);
    const tlR = new THREE.Mesh(tlGeo, tlMat);
    tlR.position.set(0.65, 0.75, -2.12);
    root.add(tlR);

    // 4 Wheels
    [
      [-0.9, 0.35, 1.25],
      [0.9, 0.35, 1.25],
      [-0.9, 0.35, -1.25],
      [0.9, 0.35, -1.25],
    ].forEach((pos) => {
      const w = createWheel(wheelRadius, 0.26);
      w.wheelGroup.position.set(pos[0], pos[1], pos[2]);
      if (pos[0] > 0) w.wheelGroup.rotation.y = Math.PI;
      root.add(w.wheelGroup);
      rims.push(w.rimGroup);
    });
  }

  // Contact shadow
  const shadowGeo = new THREE.PlaneGeometry(carWidth * 1.2, carLength * 1.1);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.position.y = 0.02;
  root.add(shadowMesh);

  let totalDist = 0;
  const updateWheelRotation = (distDelta: number) => {
    totalDist += distDelta / wheelRadius;
    rims.forEach((r, idx) => {
      r.rotation.x = idx % 2 === 0 ? totalDist : -totalDist;
    });
  };

  return {
    root,
    type,
    rims,
    wheelRadius,
    width: carWidth,
    length: carLength,
    speed: 0,
    targetLaneX: 0,
    currentLaneX: 0,
    isChangingLane: false,
    laneChangeTimer: 0,
    updateWheelRotation,
  };
}

// ----------------------------------------------------
// PROCEDURAL ENVIRONMENT PROPS: TREES, STREETLIGHTS, GANTRIES
// ----------------------------------------------------

export function createPineTree(): THREE.Group {
  const tree = new THREE.Group();

  // Trunk
  const trunkGeo = new THREE.CylinderGeometry(0.2, 0.35, 1.5, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a2e18, roughness: 0.9, metalness: 0.05 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 0.75;
  trunk.castShadow = true;
  tree.add(trunk);

  // 3 Layered foliage cones
  const foliageMat = new THREE.MeshStandardMaterial({
    color: 0x1f4a24,
    roughness: 0.85,
    metalness: 0.05,
  });

  const cone1 = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.2, 7), foliageMat);
  cone1.position.y = 2.0;
  cone1.castShadow = true;
  tree.add(cone1);

  const cone2 = new THREE.Mesh(new THREE.ConeGeometry(1.3, 1.8, 7), foliageMat);
  cone2.position.y = 3.1;
  cone2.castShadow = true;
  tree.add(cone2);

  const cone3 = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.5, 7), foliageMat);
  cone3.position.y = 4.1;
  cone3.castShadow = true;
  tree.add(cone3);

  return tree;
}

export function createDeciduousTree(): THREE.Group {
  const tree = new THREE.Group();

  // Trunk
  const trunkGeo = new THREE.CylinderGeometry(0.25, 0.4, 2.0, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2716, roughness: 0.9, metalness: 0.05 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 1.0;
  trunk.castShadow = true;
  tree.add(trunk);

  // Foliage cluster
  const folMat = new THREE.MeshStandardMaterial({ color: 0x2e6f34, roughness: 0.8, metalness: 0.05 });
  const dome1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.4, 1), folMat);
  dome1.position.set(0, 2.8, 0);
  dome1.scale.set(1.1, 1.3, 1.1);
  dome1.castShadow = true;
  tree.add(dome1);

  const dome2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9, 1), folMat);
  dome2.position.set(0.6, 2.5, 0.4);
  dome2.castShadow = true;
  tree.add(dome2);

  return tree;
}

export function createStreetLamp(): THREE.Group {
  const lamp = new THREE.Group();

  const metalMat = new THREE.MeshStandardMaterial({ color: 0x60656e, metalness: 0.85, roughness: 0.25 });

  // Vertical pole
  const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 7.5, 8);
  const pole = new THREE.Mesh(poleGeo, metalMat);
  pole.position.y = 3.75;
  pole.castShadow = true;
  lamp.add(pole);

  // Horizontal overhang arm
  const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.2, 8);
  armGeo.rotateZ(Math.PI / 2);
  const arm = new THREE.Mesh(armGeo, metalMat);
  arm.position.set(1.4, 7.4, 0);
  lamp.add(arm);

  // Lantern head
  const headGeo = new THREE.BoxGeometry(0.7, 0.2, 0.4);
  const head = new THREE.Mesh(headGeo, metalMat);
  head.position.set(2.8, 7.3, 0);
  lamp.add(head);

  // Emissive glowing bulb
  const bulbGeo = new THREE.BoxGeometry(0.5, 0.05, 0.3);
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff0c0 });
  const bulb = new THREE.Mesh(bulbGeo, bulbMat);
  bulb.position.set(2.8, 7.18, 0);
  lamp.add(bulb);

  return lamp;
}

export function createOverheadGantry(): THREE.Group {
  const gantry = new THREE.Group();

  const steelMat = new THREE.MeshStandardMaterial({ color: 0x5a6068, metalness: 0.8, roughness: 0.3 });

  // Left & right pillars
  const pillarGeo = new THREE.CylinderGeometry(0.2, 0.25, 7.5, 8);
  const leftPillar = new THREE.Mesh(pillarGeo, steelMat);
  leftPillar.position.set(-8.5, 3.75, 0);
  gantry.add(leftPillar);

  const rightPillar = new THREE.Mesh(pillarGeo, steelMat);
  rightPillar.position.set(8.5, 3.75, 0);
  gantry.add(rightPillar);

  // Cross beam
  const beamGeo = new THREE.BoxGeometry(17.6, 0.6, 0.6);
  const beam = new THREE.Mesh(beamGeo, steelMat);
  beam.position.set(0, 7.2, 0);
  gantry.add(beam);

  // Highway destination sign (Green overhead sign)
  const signGeo = new THREE.BoxGeometry(7.0, 2.2, 0.15);
  const signMat = new THREE.MeshStandardMaterial({ color: 0x0f5b33, roughness: 0.4, metalness: 0.1 });
  const sign = new THREE.Mesh(signGeo, signMat);
  sign.position.set(0, 6.2, 0);

  // White inner border on sign
  const borderGeo = new THREE.BoxGeometry(6.7, 1.9, 0.02);
  const borderMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  const border = new THREE.Mesh(borderGeo, borderMat);
  border.position.set(0, 0, 0.09);
  sign.add(border);

  // Green inner face
  const faceGeo = new THREE.BoxGeometry(6.5, 1.7, 0.02);
  const face = new THREE.Mesh(faceGeo, signMat);
  face.position.set(0, 0, 0.11);
  sign.add(face);

  gantry.add(sign);
  return gantry;
}

// ----------------------------------------------------
// ROAD CHUNK: REUSABLE HIGHWAY SECTION
// ----------------------------------------------------
export interface RoadChunkInstance {
  root: THREE.Group;
  length: number;
  roadMaterial: THREE.MeshStandardMaterial;
}

export function createRoadChunk(
  chunkLength = 120,
  asphaltTex: THREE.Texture,
  sharedTreeGeo?: { pine: THREE.Group; deciduous: THREE.Group }
): RoadChunkInstance {
  const root = new THREE.Group();
  root.name = 'RoadChunk';

  const roadWidth = 15; // 3 lanes x 3.6m + 2 shoulders

  // 1. Asphalt Road Surface
  const roadGeo = new THREE.PlaneGeometry(roadWidth, chunkLength, 1, 1);
  roadGeo.rotateX(-Math.PI / 2);

  // Configure texture repeat
  const chunkTex = asphaltTex.clone();
  chunkTex.needsUpdate = true;
  chunkTex.repeat.set(1, chunkLength / 18);

  const roadMat = new THREE.MeshStandardMaterial({
    map: chunkTex,
    roughness: 0.75,
    metalness: 0.1,
  });

  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  roadMesh.receiveShadow = true;
  root.add(roadMesh);

  // 2. Roadside Grass Terrains (left and right)
  const terrainWidth = 55;
  const terrainGeo = new THREE.PlaneGeometry(terrainWidth, chunkLength, 8, 8);
  terrainGeo.rotateX(-Math.PI / 2);

  // Add slight rolling undulation
  const posAttr = terrainGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    const bump = Math.sin(x * 0.12) * Math.cos(z * 0.08) * 0.6;
    posAttr.setY(i, bump - 0.04);
  }
  terrainGeo.computeVertexNormals();

  const grassMat = new THREE.MeshStandardMaterial({
    color: 0x2d5a27,
    roughness: 0.9,
    metalness: 0.05,
  });

  const leftTerrain = new THREE.Mesh(terrainGeo, grassMat);
  leftTerrain.position.x = -roadWidth / 2 - terrainWidth / 2;
  leftTerrain.receiveShadow = true;
  root.add(leftTerrain);

  const rightTerrain = new THREE.Mesh(terrainGeo, grassMat);
  rightTerrain.position.x = roadWidth / 2 + terrainWidth / 2;
  rightTerrain.receiveShadow = true;
  root.add(rightTerrain);

  // 3. Highway Guardrails (Metallic barriers)
  const railMat = new THREE.MeshStandardMaterial({ color: 0x9098a5, metalness: 0.85, roughness: 0.2 });
  const railGeo = new THREE.BoxGeometry(0.12, 0.45, chunkLength);

  const leftRail = new THREE.Mesh(railGeo, railMat);
  leftRail.position.set(-roadWidth / 2 - 0.15, 0.4, 0);
  leftRail.castShadow = true;
  root.add(leftRail);

  const rightRail = new THREE.Mesh(railGeo, railMat);
  rightRail.position.set(roadWidth / 2 + 0.15, 0.4, 0);
  rightRail.castShadow = true;
  root.add(rightRail);

  // Guardrail support posts
  const postGeo = new THREE.BoxGeometry(0.1, 0.6, 0.1);
  for (let z = -chunkLength / 2 + 5; z < chunkLength / 2; z += 10) {
    const pL = new THREE.Mesh(postGeo, railMat);
    pL.position.set(-roadWidth / 2 - 0.15, 0.3, z);
    root.add(pL);

    const pR = new THREE.Mesh(postGeo, railMat);
    pR.position.set(roadWidth / 2 + 0.15, 0.3, z);
    root.add(pR);
  }

  // 4. Streetlamps spaced every 40 meters
  for (let z = -chunkLength / 2 + 15; z < chunkLength / 2; z += 40) {
    const lampL = createStreetLamp();
    lampL.position.set(-roadWidth / 2 - 1.2, 0, z);
    root.add(lampL);

    const lampR = createStreetLamp();
    lampR.position.set(roadWidth / 2 + 1.2, 0, z);
    lampR.rotation.y = Math.PI; // Face inward toward road
    root.add(lampR);
  }

  // 5. Roadside Trees along the hills
  const treeCount = 14;
  for (let i = 0; i < treeCount; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const xDist = roadWidth / 2 + 5 + Math.random() * 22;
    const zPos = -chunkLength / 2 + (i / treeCount) * chunkLength + (Math.random() - 0.5) * 6;

    const tree = Math.random() > 0.4 ? createPineTree() : createDeciduousTree();
    const scale = 0.85 + Math.random() * 0.45;
    tree.scale.set(scale, scale, scale);
    tree.position.set(side * xDist, 0, zPos);
    tree.rotation.y = Math.random() * Math.PI * 2;
    root.add(tree);
  }

  return { root, length: chunkLength, roadMaterial: roadMat };
}
