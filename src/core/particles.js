// Particules (casse, dégâts, splash, fumée) — un seul Points recyclé
import * as THREE from 'three';
export class Particles {
  constructor(scene) {
    this.n = 600; this.pos = new Float32Array(this.n * 3); this.col = new Float32Array(this.n * 3);
    this.vel = new Float32Array(this.n * 3); this.life = new Float32Array(this.n);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.mat = new THREE.PointsMaterial({ size: 0.14, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false });
    this.pts = new THREE.Points(this.geo, this.mat);
    this.pts.frustumCulled = false;
    scene.add(this.pts);
    this.head = 0;
    this.c = new THREE.Color();
  }
  spawn(x, y, z, color, count = 12, spread = 2.4, up = 3) {
    this.c.set(color);
    for (let i = 0; i < count; i++) {
      const j = this.head; this.head = (this.head + 1) % this.n;
      this.pos[j * 3] = x; this.pos[j * 3 + 1] = y; this.pos[j * 3 + 2] = z;
      this.vel[j * 3] = (Math.random() - 0.5) * spread * 2;
      this.vel[j * 3 + 1] = Math.random() * up;
      this.vel[j * 3 + 2] = (Math.random() - 0.5) * spread * 2;
      this.col[j * 3] = this.c.r * (0.7 + Math.random() * 0.5);
      this.col[j * 3 + 1] = this.c.g * (0.7 + Math.random() * 0.5);
      this.col[j * 3 + 2] = this.c.b * (0.7 + Math.random() * 0.5);
      this.life[j] = 0.5 + Math.random() * 0.5;
    }
  }
  update(dt) {
    for (let j = 0; j < this.n; j++) {
      if (this.life[j] <= 0) { this.pos[j * 3 + 1] = -999; continue; }
      this.life[j] -= dt;
      this.vel[j * 3 + 1] -= 9 * dt;
      this.pos[j * 3] += this.vel[j * 3] * dt;
      this.pos[j * 3 + 1] += this.vel[j * 3 + 1] * dt;
      this.pos[j * 3 + 2] += this.vel[j * 3 + 2] * dt;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }
}
