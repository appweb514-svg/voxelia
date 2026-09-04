// Stockage des chunks + accès global (x,y,z) avec génération à la demande
import { B } from './blocks.js';
import { CHUNK, WORLD_H } from './config.js';
export class World {
  constructor(gen) {
    this.gen = gen;
    this.chunks = new Map(); // "cx,cz" -> Uint8Array
    this.dirty = new Set();
    this.torches = new Map(); // "x,y,z" -> 1 (sources de lumière)
  }
  key(cx, cz) { return cx + ',' + cz; }
  getChunk(cx, cz) {
    const k = this.key(cx, cz);
    let c = this.chunks.get(k);
    if (!c) {
      c = new Uint8Array(CHUNK * WORLD_H * CHUNK);
      this.gen.genChunk(cx, cz, c);
      this.chunks.set(k, c);
      // ré-indexe les torches du chunk
      for (let x = 0; x < CHUNK; x++) for (let z = 0; z < CHUNK; z++) for (let y = 0; y < WORLD_H; y++) {
        if (c[(y * CHUNK + z) * CHUNK + x] === B.TORCH) this.torches.set((cx * CHUNK + x) + ',' + y + ',' + (cz * CHUNK + z), 1);
      }
    }
    return c;
  }
  get(x, y, z) {
    x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
    if (y < 0 || y >= WORLD_H) return B.AIR;
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    const c = this.getChunk(cx, cz);
    return c[(y * CHUNK + (z - cz * CHUNK)) * CHUNK + (x - cx * CHUNK)];
  }
  set(x, y, z, id, markDirty = true) {
    x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
    if (y < 0 || y >= WORLD_H) return false;
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    const c = this.getChunk(cx, cz);
    c[(y * CHUNK + (z - cz * CHUNK)) * CHUNK + (x - cx * CHUNK)] = id;
    const tk = x + ',' + y + ',' + z;
    if (id === B.TORCH) this.torches.set(tk, 1); else this.torches.delete(tk);
    if (markDirty) {
      this.dirty.add(this.key(cx, cz));
      const lx = x - cx * CHUNK, lz = z - cz * CHUNK;
      if (lx === 0) this.dirty.add(this.key(cx - 1, cz));
      if (lx === CHUNK - 1) this.dirty.add(this.key(cx + 1, cz));
      if (lz === 0) this.dirty.add(this.key(cx, cz - 1));
      if (lz === CHUNK - 1) this.dirty.add(this.key(cx, cz + 1));
    }
    return true;
  }
  topY(x, z) {
    for (let y = WORLD_H - 1; y > 0; y--) { const b = this.get(x, y, z); if (b !== B.AIR && b !== B.WATER && b !== B.SNOW) return y; }
    return 1;
  }
  unloadFar(pcx, pcz, dist) {
    for (const k of [...this.chunks.keys()]) {
      const [cx, cz] = k.split(',').map(Number);
      if (Math.max(Math.abs(cx - pcx), Math.abs(cz - pcz)) > dist + 1) { this.chunks.delete(k); this.dirty.delete(k); }
    }
  }
  serializeDiffs() {
    // Compare chunks chargés vs régénération : coûteux → on stocke les diffs suivis par set() via journal
    return { edits: this.journal ?? [] };
  }
}
