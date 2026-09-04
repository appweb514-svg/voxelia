// Contrôleur FPS : pointer lock, physique AABB, nage, vol
import * as THREE from 'three';
import { GRAVITY, WALK, RUN, JUMP } from '../core/config.js';
import { isCollide, B } from '../core/blocks.js';
export class Player {
  constructor(camera, world) {
    this.camera = camera; this.world = world;
    this.pos = new THREE.Vector3(8.5, 40, 8.5);
    this.vel = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0;
    this.onGround = false; this.fly = false;
    this.w = 0.6; this.h = 1.8; this.eye = 1.62;
    this.keys = {};
    this.hp = 20; this.food = 20; this.xp = 0; this.xplvl = 0;
    this.dead = false;
    this.foodTimer = 0;
  }
  spawn(p) { this.pos.set(p.x, p.y, p.z); this.vel.set(0, 0, 0); this.hp = 20; this.food = 20; this.dead = false; }
  solidAt(x, y, z) { const b = this.world.get(x, y, z); return isCollide(b); }
  collides(px, py, pz) {
    const w = this.w / 2, h = this.h;
    const pts = [
      [px - w, py, pz - w], [px + w, py, pz - w], [px - w, py, pz + w], [px + w, py, pz + w],
      [px - w, py + h / 2, pz - w], [px + w, py + h / 2, pz - w], [px - w, py + h / 2, pz + w], [px + w, py + h / 2, pz + w],
      [px - w, py + h, pz - w], [px + w, py + h, pz - w], [px - w, py + h, pz + w], [px + w, py + h, pz + w],
    ];
    return pts.some(([x, y, z]) => this.solidAt(x, y, z));
  }
  inWater() { return this.world.get(this.pos.x, this.pos.y + 0.4, this.pos.z) === B.WATER || this.world.get(this.pos.x, this.pos.y + 1.2, this.pos.z) === B.WATER; }
  update(dt, opts = {}) {
    if (this.dead) return;
    const k = this.keys;
    const run = k['shift'] ? RUN : WALK;
    const f = (k['KeyW'] ? 1 : 0) - (k['KeyS'] ? 1 : 0);
    const s = (k['KeyD'] ? 1 : 0) - (k['KeyA'] ? 1 : 0);
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    let dx = (-sin * f + cos * s), dz = (-cos * f - sin * s);
    const l = Math.hypot(dx, dz) || 1;
    const water = this.inWater();
    const speed = this.fly ? 11 : water ? run * 0.55 : run;
    dx = dx / l * speed * (f || s ? 1 : 0); dz = dz / l * speed * (f || s ? 1 : 0);
    if (this.fly) {
      let dy = 0;
      if (k['Space']) dy += 9; if (k['ShiftLeft'] || k['KeyC']) dy -= 9;
      this.moveAxis(dt, dx, dy, dz);
      this.vel.set(0, 0, 0);
    } else if (water) {
      this.vel.x = dx; this.vel.z = dz;
      this.vel.y -= GRAVITY * 0.35 * dt;
      if (k['Space']) this.vel.y = Math.min(this.vel.y + 40 * dt, 4.5);
      this.vel.y = Math.max(this.vel.y, -4);
      this.moveAxis(dt, this.vel.x, this.vel.y, this.vel.z);
    } else {
      this.vel.x = dx; this.vel.z = dz;
      this.vel.y -= GRAVITY * dt;
      if (k['Space'] && this.onGround) { this.vel.y = JUMP; this.onGround = false; }
      const fallBefore = this.vel.y;
      this.moveAxis(dt, this.vel.x, this.vel.y, this.vel.z);
      void fallBefore;
    }
    // faim / regen
    this.foodTimer += dt;
    if (this.foodTimer > 4) {
      this.foodTimer = 0;
      if (this.food > 0) this.food -= 0.25;
      if (this.food > 14 && this.hp < 20 && this.food > 0) { this.hp = Math.min(20, this.hp + 1); this.food -= 1; }
      if (this.food <= 0) this.hp -= 1;
      if (this.hp <= 0 && !this.dead && !opts.god) { this.dead = true; }
    }
    this.camera.position.set(this.pos.x, this.pos.y + this.eye, this.pos.z);
    this.camera.rotation.set(0, 0, 0);
    this.camera.rotateY(this.yaw); this.camera.rotateX(this.pitch);
  }
  moveAxis(dt, vx, vy, vz) {
    const p = this.pos;
    // X
    let nx = p.x + vx * dt;
    if (!this.collides(nx, p.y, p.z)) p.x = nx; else this.vel.x = 0;
    // Z
    let nz = p.z + vz * dt;
    if (!this.collides(p.x, p.y, nz)) p.z = nz; else this.vel.z = 0;
    // Y
    let ny = p.y + vy * dt;
    this.onGround = false;
    if (!this.collides(p.x, ny, p.z)) { p.y = ny; }
    else {
      if (vy < -12) { const d = Math.floor(-(vy + 12) / 4); this.hp -= d; if (window.__hurt) window.__hurt(d, 'chute'); }
      if (vy < 0) this.onGround = true;
      this.vel.y = 0;
    }
    if (p.y < -10) { this.hp = 0; this.dead = true; }
  }
  look(dx, dy, sens) {
    this.yaw -= dx * 0.0022 * sens;
    this.pitch -= dy * 0.0022 * sens;
    this.pitch = Math.max(-1.55, Math.min(1.55, this.pitch));
  }
  damage(n) { this.hp -= n; if (this.hp <= 0) { this.hp = 0; this.dead = true; } }
  heal(n) { this.hp = Math.min(20, this.hp + n); }
  eat(n) { this.food = Math.min(20, this.food + n); }
}
