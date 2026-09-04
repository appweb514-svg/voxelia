// Créatures : cochons/moutons passifs, zombis nocturnes, limaces rebondissantes. Modèles cubiques originaux.
import * as THREE from 'three';
import { B } from '../core/blocks.js';
function box(w, h, d, color) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
  m.castShadow = false;
  return m;
}
export class Mob {
  constructor(kind, x, y, z) {
    this.kind = kind; this.g = new THREE.Group();
    this.vel = new THREE.Vector3();
    this.hp = kind === 'zombie' ? 20 : kind === 'slime' ? 12 : 10;
    this.t = Math.random() * 10; this.dir = Math.random() * Math.PI * 2;
    this.hurtT = 0; this.attackT = 0;
    const passive = kind === 'pig' || kind === 'sheep';
    this.passive = passive;
    if (kind === 'pig') {
      const body = box(0.9, 0.6, 1.2, 0xf0a0b0); body.position.y = 0.7; this.g.add(body);
      const head = box(0.55, 0.55, 0.55, 0xf4b0bc); head.position.set(0, 0.95, 0.8); this.g.add(head);
      const sn = box(0.25, 0.2, 0.1, 0xd87888); sn.position.set(0, 0.9, 1.1); this.g.add(sn);
      this.legs = [];
      for (const [lx, lz] of [[-0.3, -0.4], [0.3, -0.4], [-0.3, 0.4], [0.3, 0.4]]) { const l = box(0.2, 0.45, 0.2, 0xd87888); l.position.set(lx, 0.22, lz); this.g.add(l); this.legs.push(l); }
      this.drop = 'pork';
    } else if (kind === 'sheep') {
      const body = box(1.0, 0.75, 1.3, 0xe8e4da); body.position.y = 0.75; this.g.add(body);
      const head = box(0.45, 0.45, 0.5, 0x8a7a6a); head.position.set(0, 0.9, 0.85); this.g.add(head);
      this.legs = [];
      for (const [lx, lz] of [[-0.35, -0.45], [0.35, -0.45], [-0.35, 0.45], [0.35, 0.45]]) { const l = box(0.18, 0.45, 0.18, 0x6a5a4a); l.position.set(lx, 0.22, lz); this.g.add(l); this.legs.push(l); }
      this.drop = 'wool_item';
    } else if (kind === 'zombie') {
      const body = box(0.6, 0.9, 0.35, 0x3a6b4f); body.position.y = 1.0; this.g.add(body);
      const head = box(0.5, 0.5, 0.5, 0x4a8b5f); head.position.set(0, 1.7, 0); this.g.add(head);
      const e1 = box(0.1, 0.1, 0.05, 0xff2222); e1.position.set(-0.12, 1.72, 0.26); this.g.add(e1);
      const e2 = e1.clone(); e2.position.x = 0.12; this.g.add(e2);
      this.legs = [];
      for (const lx of [-0.18, 0.18]) { const l = box(0.22, 0.6, 0.25, 0x2a4a6b); l.position.set(lx, 0.3, 0); this.g.add(l); this.legs.push(l); }
      this.drop = null;
    } else { // slime
      this.body = box(0.8, 0.6, 0.8, 0x4ae08a); this.body.position.y = 0.4; this.body.material.transparent = true; this.body.material.opacity = 0.85; this.g.add(this.body);
      this.legs = [];
      this.drop = null;
    }
    this.g.position.set(x, y, z);
    this.w = 0.8; this.h = kind === 'zombie' ? 1.9 : 1.1;
  }
  get pos() { return this.g.position; }
  damage(n, kx = 0, kz = 0) {
    this.hp -= n; this.hurtT = 0.3;
    this.vel.x += kx; this.vel.z += kz;
    return this.hp <= 0;
  }
}
export class MobManager {
  constructor(scene, world, particles) {
    this.scene = scene; this.world = world; this.particles = particles;
    this.mobs = [];
    this.timer = 0;
  }
  spawn(kind, x, y, z) {
    if (this.mobs.length > 24) return null;
    const m = new Mob(kind, x, y, z);
    this.mobs.push(m); this.scene.add(m.g);
    return m;
  }
  update(dt, player, isNight, onPlayerHurt, onMobDead) {
    this.t += 0; this.timer += dt;
    // respawn naturel
    if (this.timer > 6) {
      this.timer = 0;
      const px = player.pos.x, pz = player.pos.z;
      const kind = isNight ? (Math.random() < 0.6 ? 'zombie' : 'slime') : (Math.random() < 0.5 ? 'pig' : Math.random() < 0.7 ? 'sheep' : 'slime');
      const a = Math.random() * Math.PI * 2, r = 18 + Math.random() * 14;
      const x = Math.floor(px + Math.cos(a) * r), z = Math.floor(pz + Math.sin(a) * r);
      const y = this.world.topY(x, z) + 1;
      if (y > 22) this.spawn(kind, x + 0.5, y, z + 0.5);
      // les zombis brûlent le jour
      for (const m of this.mobs) if (m.kind === 'zombie' && !isNight) { m.hp -= 4 * 6; if (m.hp <= 0) this.kill(m, onMobDead); else this.particles.spawn(m.pos.x, m.pos.y + 1.5, m.pos.z, 0xffaa00, 6, 1, 2); }
    }
    for (const m of [...this.mobs]) {
      m.t += dt; if (m.hurtT > 0) m.hurtT -= dt; if (m.attackT > 0) m.attackT -= dt;
      const dx = player.pos.x - m.pos.x, dz = player.pos.z - m.pos.z;
      const dist = Math.hypot(dx, dz);
      let mx = 0, mz = 0;
      if (m.kind === 'zombie' && dist < 24 && !player.dead) {
        mx = dx / (dist || 1) * 3.2; mz = dz / (dist || 1) * 3.2;
        m.g.rotation.y = Math.atan2(dx, dz);
        if (dist < 1.8 && m.attackT <= 0) { m.attackT = 1.0; onPlayerHurt(3, 'zombi'); }
      } else if (m.passive && m.flee > 0) {
        m.flee -= dt; mx = m.fleeX * 4; mz = m.fleeZ * 4;
      } else if (m.kind === 'slime') {
        m.hopT = (m.hopT ?? 0) - dt;
        if (m.hopT <= 0) { m.hopT = 0.8 + Math.random(); m.dir = Math.random() * Math.PI * 2; m.vy = 6; }
        mx = Math.sin(m.dir) * 2.5; mz = Math.cos(m.dir) * 2.5;
        const s = 1 + Math.sin(m.t * 10) * 0.12; m.body.scale.set(s, 2 - s, s);
        if (dist < 1.6 && m.attackT <= 0 && !player.dead) { m.attackT = 1.2; onPlayerHurt(2, 'limace'); }
      } else {
        if (Math.random() < dt * 0.3) m.dir = Math.random() * Math.PI * 2;
        const sp = m.passive ? 1.4 : 1.0;
        mx = Math.sin(m.dir) * sp; mz = Math.cos(m.dir) * sp;
        m.g.rotation.y = m.dir;
      }
      // gravité + mouvement simple avec collision
      m.vy = (m.vy ?? 0) - 22 * dt;
      if (m.kind === 'slime' && m.vy < 0 && this.ground(m)) { m.vy = 0; }
      this.moveMob(m, mx * dt, (m.vy ?? 0) * dt, mz * dt);
      // animation pattes
      if (m.legs) m.legs.forEach((l, i) => { l.rotation.x = Math.sin(m.t * 8 + i * Math.PI) * 0.5 * Math.min(1, Math.hypot(mx, mz)); });
      // chute dans l'eau : flotte
      if (this.world.get(m.pos.x, m.pos.y, m.pos.z) === B.WATER) { m.pos.y += dt * 1.5; m.vy = 0; }
      if (m.pos.y < -12) this.kill(m, onMobDead, false);
    }
  }
  ground(m) {
    return this.world.get(m.pos.x, m.pos.y - 0.1, m.pos.z) !== B.AIR && this.world.get(m.pos.x, m.pos.y - 0.1, m.pos.z) !== B.WATER;
  }
  moveMob(m, dx, dy, dz) {
    const solid = (x, y, z) => { const b = this.world.get(x, y, z); return b !== B.AIR && b !== B.WATER && b !== B.SNOW; };
    const w = 0.35;
    let nx = m.pos.x + dx;
    if (!solid(nx + Math.sign(dx) * w, m.pos.y + 0.2, m.pos.z) && !solid(nx + Math.sign(dx) * w, m.pos.y + 0.9, m.pos.z)) m.pos.x = nx;
    else if (m.kind === 'zombie') { // saute les obstacles d'1 bloc
      if (!solid(m.pos.x, m.pos.y + 1.2, m.pos.z)) m.pos.y += 0.12;
    }
    let nz = m.pos.z + dz;
    if (!solid(m.pos.x, m.pos.y + 0.2, nz + Math.sign(dz) * w) && !solid(m.pos.x, m.pos.y + 0.9, nz + Math.sign(dz) * w)) m.pos.z = nz;
    let ny = m.pos.y + dy;
    if (!solid(m.pos.x, ny, m.pos.z) && !solid(m.pos.x, ny + m.h * 0.7, m.pos.z)) m.pos.y = ny;
    else { if (dy < 0) { m.pos.y = Math.floor(ny) + 1; } m.vy = 0; }
  }
  kill(m, onMobDead, drop = true) {
    this.scene.remove(m.g);
    this.mobs.splice(this.mobs.indexOf(m), 1);
    this.particles.spawn(m.pos.x, m.pos.y + 0.7, m.pos.z, 0xff5555, 16, 2.5, 4);
    if (drop && onMobDead) onMobDead(m);
  }
  hitTest(origin, dir, maxD = 4) {
    // retourne le mob touché le plus proche
    let best = null, bestD = maxD;
    for (const m of this.mobs) {
      const cx = m.pos.x - origin.x, cy = (m.pos.y + 0.9) - origin.y, cz = m.pos.z - origin.z;
      const t = cx * dir.x + cy * dir.y + cz * dir.z;
      if (t < 0 || t > bestD) continue;
      const px = origin.x + dir.x * t - m.pos.x, py = origin.y + dir.y * t - (m.pos.y + 0.9), pz = origin.z + dir.z * t - m.pos.z;
      if (px * px + py * py + pz * pz < 1.1) { best = m; bestD = t; }
    }
    return best;
  }
}
