import * as THREE from 'three';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  life: number;
  maxLife: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles = 300;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;
  private positions: Float32Array;
  private colors: Float32Array;

  constructor(scene: THREE.Scene) {
    this.positions = new Float32Array(this.maxParticles * 3);
    this.colors = new Float32Array(this.maxParticles * 3);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    // Procedural soft circle sprite canvas
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.4, 'rgba(255, 200, 100, 0.8)');
    grad.addColorStop(1, 'rgba(255, 100, 50, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);

    this.material = new THREE.PointsMaterial({
      size: 0.8,
      map: texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  public emitExhaustSmoke(origin: THREE.Vector3, isBoosting: boolean) {
    if (this.particles.length >= this.maxParticles) return;

    const count = isBoosting ? 4 : 1;
    for (let i = 0; i < count; i++) {
      const p: Particle = {
        position: origin.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.1, (Math.random() - 0.5) * 0.2)),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.8,
          0.3 + Math.random() * 0.5,
          -2 - Math.random() * (isBoosting ? 6 : 2)
        ),
        color: isBoosting ? new THREE.Color(0x00f0ff) : new THREE.Color(0x999999),
        size: isBoosting ? 0.7 : 0.45,
        life: 0,
        maxLife: isBoosting ? 0.45 : 0.7,
      };
      this.particles.push(p);
    }
  }

  public emitTireSmoke(origin: THREE.Vector3) {
    if (this.particles.length >= this.maxParticles) return;
    for (let i = 0; i < 2; i++) {
      const p: Particle = {
        position: origin.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.1, (Math.random() - 0.5) * 0.3)),
        velocity: new THREE.Vector3((Math.random() - 0.5) * 1.2, 0.4 + Math.random() * 0.6, -1 - Math.random() * 2),
        color: new THREE.Color(0xcccccc),
        size: 0.6,
        life: 0,
        maxLife: 0.6,
      };
      this.particles.push(p);
    }
  }

  public emitCrashExplosion(origin: THREE.Vector3) {
    // Large explosion burst
    for (let i = 0; i < 90; i++) {
      const speed = 4 + Math.random() * 14;
      const angleTheta = Math.random() * Math.PI * 2;
      const anglePhi = (Math.random() - 0.3) * Math.PI;

      const vx = Math.cos(angleTheta) * Math.cos(anglePhi) * speed;
      const vy = Math.abs(Math.sin(anglePhi)) * speed + 2;
      const vz = Math.sin(angleTheta) * Math.cos(anglePhi) * speed;

      const isFire = Math.random() > 0.3;
      const color = isFire
        ? new THREE.Color(Math.random() > 0.5 ? 0xff3300 : 0xffaa00)
        : new THREE.Color(0xffffff);

      this.particles.push({
        position: origin.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.5, 0.5, (Math.random() - 0.5) * 0.5)),
        velocity: new THREE.Vector3(vx, vy, vz),
        color,
        size: 1.0 + Math.random() * 1.2,
        life: 0,
        maxLife: 0.8 + Math.random() * 0.8,
      });
    }
  }

  public update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      p.position.addScaledVector(p.velocity, dt);
      p.velocity.y -= 4.0 * dt; // Gravity
      p.size *= 1.01; // Expand
    }

    // Update buffer attributes
    const pos = this.positions;
    const col = this.colors;
    let idx = 0;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      pos[idx * 3] = p.position.x;
      pos[idx * 3 + 1] = p.position.y;
      pos[idx * 3 + 2] = p.position.z;

      const alpha = 1.0 - p.life / p.maxLife;
      col[idx * 3] = p.color.r * alpha;
      col[idx * 3 + 1] = p.color.g * alpha;
      col[idx * 3 + 2] = p.color.b * alpha;
      idx++;
    }

    // Clear unused slots
    for (let i = idx; i < this.maxParticles; i++) {
      pos[i * 3] = 0;
      pos[i * 3 + 1] = -9999;
      pos[i * 3 + 2] = 0;
      col[i * 3] = 0;
      col[i * 3 + 1] = 0;
      col[i * 3 + 2] = 0;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  public dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
